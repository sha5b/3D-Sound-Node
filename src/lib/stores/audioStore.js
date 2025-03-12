import { writable } from 'svelte/store';

/**
 * Store for managing the audio engine instance
 * This allows components to access the audio engine from anywhere
 */
const createAudioStore = () => {
  // Initially null, will be set when the audio engine is initialized
  const { subscribe, set, update } = writable(null);
  
  return {
    subscribe,
    set,
    
    /**
     * Set the master volume
     * @param {number} value - Volume value between 0 and 1
     */
    setVolume: (value) => {
      update(audioEngine => {
        if (audioEngine) {
          audioEngine.setMasterVolume(value);
        }
        return audioEngine;
      });
    },
    
    /**
     * Update the listener position (camera position)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    updateListenerPosition: (x, y, z) => {
      update(audioEngine => {
        if (audioEngine) {
          audioEngine.updateListenerPosition(x, y, z);
        }
        return audioEngine;
      });
    },
    
    /**
     * Initialize the audio engine
     * Must be called after user interaction to avoid autoplay restrictions
     */
    initialize: () => {
      update(audioEngine => {
        if (audioEngine) {
          audioEngine.initialize();
        }
        return audioEngine;
      });
    }
  };
};

export const audioStore = createAudioStore();
