/**
 * Audio processing utilities and constants
 */

// AudioWorklet processor URL - will be resolved by bundler
export const VAD_PROCESSOR_URL = new URL('./vad-processor.js', import.meta.url);

/**
 * Check if AudioWorklet is supported in current environment
 */
export function isAudioWorkletSupported(): boolean {
  return (
    typeof AudioWorklet !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    'audioWorklet' in AudioContext.prototype
  );
}

/**
 * AudioWorklet VAD configuration
 */
export interface AudioWorkletVADConfig {
  threshold: number;
  silenceDuration: number;
}

/**
 * Default AudioWorklet VAD configuration
 */
export const DEFAULT_WORKLET_VAD_CONFIG: AudioWorkletVADConfig = {
  threshold: 0.01, // RMS threshold for voice detection
  silenceDuration: 1500, // ms of silence before ending voice segment
};