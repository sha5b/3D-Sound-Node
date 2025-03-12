/**
 * Class for handling audio synthesis and processing
 */
export class AudioEngine {
  audioContext: AudioContext;
  oscillators: Map<string, OscillatorNode>;
  gainNodes: Map<string, GainNode>;
  masterGain: GainNode;
  audioBuffers: Map<string, AudioBuffer>;
  audioSources: Map<string, AudioBufferSourceNode>;
  
  // Sample sound paths from local static directory
  static readonly SAMPLE_SOUNDS = {
    'sine': '/static/sounds/Alesis-Fusion-Bass-C3.wav', // Sine wave
    'square': '/static/sounds/Casio-MT-45-Bass-I-C2.wav', // Square wave
    'sawtooth': '/static/sounds/Bamboo.wav', // Sawtooth wave
    'triangle': '/static/sounds/Alesis-Fusion-Bass-C3.wav', // Triangle wave (reusing sound)
    'central': '/static/sounds/Bamboo.wav' // Special sound for central node (reusing sound)
  };
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.oscillators = new Map();
    this.gainNodes = new Map();
    this.audioBuffers = new Map();
    this.audioSources = new Map();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);
  }
  
  /**
   * Initialize the audio engine and preload sample sounds
   */
  async initialize(): Promise<void> {
    // Preload all sample sounds
    const loadPromises = Object.entries(AudioEngine.SAMPLE_SOUNDS).map(
      ([key, url]) => this.loadSample(key, url)
    );
    
    try {
      await Promise.all(loadPromises);
      console.log('All audio samples loaded successfully');
    } catch (error) {
      console.error('Error loading audio samples:', error);
    }
  }
  
  /**
   * Load an audio sample from a URL
   * @param {string} id - Identifier for the sample
   * @param {string} url - URL of the audio file
   */
  async loadSample(id: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(id, audioBuffer);
      console.log(`Loaded audio sample: ${id}`);
    } catch (error) {
      console.error(`Error loading audio sample ${id}:`, error);
    }
  }
  
  /**
   * Create an oscillator for a node
   * @param {string} nodeId - ID of the node
   * @param {string} type - Type of oscillator (sine, square, sawtooth, triangle)
   * @param {number} frequency - Frequency in Hz
   */
  createOscillator(nodeId: string, type: OscillatorType = 'sine', frequency: number = 440): void {
    // Stop and remove existing oscillator if it exists
    this.stopOscillator(nodeId);
    
    // Create new oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    // Create gain node for this oscillator
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;
    
    // Connect oscillator to gain node and gain node to master gain
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start oscillator
    oscillator.start();
    
    // Store references
    this.oscillators.set(nodeId, oscillator);
    this.gainNodes.set(nodeId, gainNode);
  }
  
  /**
   * Play a node's sound
   * @param {string} nodeId - ID of the node
   * @param {number} duration - Duration in seconds
   * @param {string} soundType - Type of sound to play (sine, square, etc.)
   */
  playNode(nodeId: string, duration: number = 0.5, soundType: string = 'sine'): void {
    console.log(`Playing sound for node ${nodeId} with type ${soundType}`);
    
    // Make sure audio context is running
    if (this.audioContext.state === 'suspended') {
      console.log('Resuming audio context');
      this.audioContext.resume();
    }
    
    // First try to play a sample sound if available
    if (this.playSampleSound(nodeId, soundType)) {
      console.log(`Sample sound played for ${nodeId} with type ${soundType}`);
      return; // Sample sound played successfully
    } else {
      console.log(`No sample sound available for ${soundType}, falling back to oscillator`);
    }
    
    // Fall back to oscillator if no sample sound
    const gainNode = this.gainNodes.get(nodeId);
    
    if (!gainNode) {
      console.log(`No gain node for ${nodeId}, creating oscillator`);
      this.createOscillator(nodeId, soundType as OscillatorType);
      const newGainNode = this.gainNodes.get(nodeId);
      if (newGainNode) {
        // Ramp up gain
        newGainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        newGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        newGainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
        
        // Ramp down gain after duration
        newGainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
      }
      return;
    }
    
    // Ramp up gain
    gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
    
    // Ramp down gain after duration
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
  }
  
  /**
   * Play a sample sound for a node
   * @param {string} nodeId - ID of the node
   * @param {string} soundType - Type of sound to play
   * @returns {boolean} Whether a sample sound was played
   */
  playSampleSound(nodeId: string, soundType: string = 'sine'): boolean {
    // Special case for central node
    const sampleKey = nodeId === 'central-node' ? 'central' : soundType;
    
    // Get the audio buffer for this sound type
    const buffer = this.audioBuffers.get(sampleKey);
    if (!buffer) {
      return false;
    }
    
    // Stop any currently playing source for this node
    this.stopSampleSound(nodeId);
    
    // Create a new audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Create a gain node for this source
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0.5;
    
    // Connect source to gain node and gain node to master gain
    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start the source
    source.start();
    
    // Store reference to the source
    this.audioSources.set(nodeId, source);
    
    return true;
  }
  
  /**
   * Stop a sample sound for a node
   * @param {string} nodeId - ID of the node
   */
  stopSampleSound(nodeId: string): void {
    const source = this.audioSources.get(nodeId);
    
    if (source) {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if source is already stopped
      }
      this.audioSources.delete(nodeId);
    }
  }
  
  /**
   * Stop a node's oscillator
   * @param {string} nodeId - ID of the node
   */
  stopOscillator(nodeId: string): void {
    const oscillator = this.oscillators.get(nodeId);
    const gainNode = this.gainNodes.get(nodeId);
    
    if (oscillator) {
      oscillator.stop();
      this.oscillators.delete(nodeId);
    }
    
    if (gainNode) {
      gainNode.disconnect();
      this.gainNodes.delete(nodeId);
    }
  }
  
  /**
   * Set the master volume
   * @param {number} volume - Volume level (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * Dispose of the audio engine
   */
  dispose(): void {
    // Stop all oscillators
    this.oscillators.forEach((oscillator, nodeId) => {
      this.stopOscillator(nodeId);
    });
    
    // Stop all sample sounds
    this.audioSources.forEach((source, nodeId) => {
      this.stopSampleSound(nodeId);
    });
    
    // Disconnect master gain
    this.masterGain.disconnect();
    
    // Close audio context
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
