/**
 * Audio Engine for 3D Sound Node Visualization
 * Handles audio context, spatial audio, and node sound generation
 */
export class AudioEngine {
  /**
   * Create a new AudioEngine instance
   */
  constructor() {
    // Create audio context (with fallback for older browsers)
    this.audioContext = null;
    
    // Initialize on first user interaction to avoid autoplay restrictions
    this.initialized = false;
  }
  
  /**
   * Initialize the audio context (must be called after user interaction)
   * @returns {boolean} Success status
   */
  initialize() {
    if (this.initialized) return true;
    
    try {
      // Create audio context with fallback
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5; // Set default volume to 50%
      this.masterGain.connect(this.audioContext.destination);
      
      // Create spatial audio listener
      this.listener = this.audioContext.listener;
      
      // Set listener position at origin
      if (this.listener.positionX) {
        // Modern API
        this.listener.positionX.value = 0;
        this.listener.positionY.value = 0;
        this.listener.positionZ.value = 0;
      } else {
        // Legacy API
        this.listener.setPosition(0, 0, 0);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return false;
    }
  }
  
  /**
   * Set the master volume
   * @param {number} value - Volume value between 0 and 1
   */
  setMasterVolume(value) {
    if (!this.initialized) return;
    
    const volume = Math.max(0, Math.min(1, value));
    this.masterGain.gain.value = volume;
  }
  
  /**
   * Create a sound source for a node
   * @param {Object} node - The node object
   * @returns {Object} Audio nodes (oscillator, gain, panner)
   */
  createNodeSound(node) {
    if (!this.initialized) {
      this.initialize();
    }
    
    if (!this.audioContext) return null;
    
    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = node.soundType || 'sine';
    oscillator.frequency.value = node.frequency || 440;
    
    // Create gain node for this sound
    const gain = this.audioContext.createGain();
    gain.gain.value = 0.1; // Start quiet
    
    // Create panner for spatial positioning
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF'; // Head-related transfer function for realistic 3D audio
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    
    // Set position based on node coordinates
    if (panner.positionX) {
      // Modern API
      panner.positionX.value = node.x || 0;
      panner.positionY.value = node.y || 0;
      panner.positionZ.value = node.z || 0;
    } else {
      // Legacy API
      panner.setPosition(node.x || 0, node.y || 0, node.z || 0);
    }
    
    // Connect the audio nodes
    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);
    
    return { oscillator, gain, panner };
  }
  
  /**
   * Update the listener position (camera position)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   */
  updateListenerPosition(x, y, z) {
    if (!this.initialized || !this.listener) return;
    
    if (this.listener.positionX) {
      // Modern API
      this.listener.positionX.value = x;
      this.listener.positionY.value = y;
      this.listener.positionZ.value = z;
    } else {
      // Legacy API
      this.listener.setPosition(x, y, z);
    }
  }
  
  /**
   * Clean up and close the audio context
   */
  dispose() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
