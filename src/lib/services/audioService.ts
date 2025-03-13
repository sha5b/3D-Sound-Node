/**
 * Audio service for loading, playing, and analyzing audio files
 */
export class AudioService {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private isPlaying = false;
  private currentAudioFile: string | null = null;
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    // AudioContext is created on user interaction to comply with browser policies
  }

  /**
   * Initialize the audio context (must be called on user interaction)
   */
  public initialize(): void {
    if (!this.isBrowser) return;
    
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.gainNode = this.audioContext.createGain();
      
      // Configure analyser
      this.analyser.fftSize = 1024;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Connect nodes
      if (this.gainNode && this.analyser && this.audioContext) {
        this.gainNode.connect(this.audioContext.destination);
        this.analyser.connect(this.gainNode);
      }
    }
  }

  /**
   * Load and play an audio file
   * @param audioFile Path to the audio file
   */
  public async playAudio(audioFile: string): Promise<void> {
    if (!this.isBrowser) return;
    
    this.initialize();
    
    if (!this.audioContext) {
      console.error('Audio context not initialized');
      return;
    }

    // Stop current audio if playing
    if (this.isPlaying) {
      this.stopAudio();
    }

    // Create new audio element
    this.audioElement = new Audio(audioFile);
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true; // Make audio loop
    
    // Create and connect source
    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    if (this.source && this.analyser) {
      this.source.connect(this.analyser);
    }
    
    // Play audio
    try {
      await this.audioElement.play();
      this.isPlaying = true;
      this.currentAudioFile = audioFile;
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  /**
   * Stop the currently playing audio
   */
  public stopAudio(): void {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
    
    // Disconnect source if it exists
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    this.audioElement = null;
    this.currentAudioFile = null;
  }

  /**
   * Get frequency data for visualization
   * @returns Frequency data array or null if not available
   */
  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray || !this.isPlaying) {
      return null;
    }
    
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Get waveform data for visualization
   * @returns Time domain data array or null if not available
   */
  public getWaveformData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray || !this.isPlaying) {
      return null;
    }
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Check if audio is currently playing
   */
  public isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the currently playing audio file
   */
  public getCurrentAudioFile(): string | null {
    return this.currentAudioFile;
  }

  /**
   * Set the volume (0 to 1)
   */
  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

// Create a singleton instance
export const audioService = new AudioService();
