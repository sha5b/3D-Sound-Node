import { writable } from 'svelte/store';
import type { AudioEngine } from '$lib/audio/audioEngine';

/**
 * Store for managing the audio engine
 */
export const audioStore = writable<AudioEngine | null>(null);
