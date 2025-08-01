import { useRef, useCallback, useEffect } from "react";
import {
  VAD_PROCESSOR_URL,
  isAudioWorkletSupported,
  DEFAULT_WORKLET_VAD_CONFIG,
} from "../audio";
import type { VADOptions } from "../types";

export interface AudioWorkletVADHook {
  startWorkletVAD: (
    audioContext: AudioContext,
    source: MediaStreamAudioSourceNode,
    onVoiceStart: () => void,
    onVoiceEnd: () => void
  ) => Promise<(() => void) | null>;
  stopWorkletVAD: () => void;
  isSupported: boolean;
}

/**
 * Hook for AudioWorklet-based Voice Activity Detection
 * Provides real-time voice detection using Web Audio API's AudioWorklet
 */
export function useAudioWorkletVAD(config: VADOptions): AudioWorkletVADHook {
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isModuleLoadedRef = useRef(false);
  const isSupported = isAudioWorkletSupported();

  /**
   * Load AudioWorklet module if not already loaded
   */
  const loadWorkletModule = useCallback(
    async (audioContext: AudioContext): Promise<boolean> => {
      if (isModuleLoadedRef.current) return true;

      try {
        await audioContext.audioWorklet.addModule(VAD_PROCESSOR_URL);
        isModuleLoadedRef.current = true;
        console.log("AudioWorklet VAD module loaded successfully");
        return true;
      } catch (error) {
        console.error("Failed to load AudioWorklet VAD module:", error);
        return false;
      }
    },
    []
  );

  /**
   * Start AudioWorklet-based voice activity detection
   */
  const startWorkletVAD = useCallback(
    async (
      audioContext: AudioContext,
      source: MediaStreamAudioSourceNode,
      onVoiceStart: () => void,
      onVoiceEnd: () => void
    ): Promise<(() => void) | null> => {
      if (!isSupported) {
        console.warn("AudioWorklet not supported, cannot start worklet VAD");
        return null;
      }

      console.log("audio worklet started");

      try {
        // Ensure AudioContext is running
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log("AudioContext resumed");
        }

        // Load worklet module
        const moduleLoaded = await loadWorkletModule(audioContext);
        if (!moduleLoaded) return null;

        // Create AudioWorklet node with configuration
        const workletNode = new AudioWorkletNode(
          audioContext,
          "vad-processor",
          {
            processorOptions: {
              threshold:
                config.threshold || DEFAULT_WORKLET_VAD_CONFIG.threshold,
              silenceDuration:
                config.silenceDuration ||
                DEFAULT_WORKLET_VAD_CONFIG.silenceDuration,
            },
          }
        );

        // Set up message handling
        workletNode.port.onmessage = (event) => {
          console.log("audio worklet message received", event.data);
          const { type, timestamp, ...data } = event.data;

          switch (type) {
            case "voice_start":
              console.log("AudioWorklet: Voice detected", {
                timestamp,
                ...data,
              });
              onVoiceStart();
              break;
            case "voice_end":
              console.log("AudioWorklet: Voice ended", { timestamp, ...data });
              onVoiceEnd();
              break;
            default:
              console.warn("Unknown AudioWorklet message type:", type);
          }
        };

        // Connect audio pipeline
        source.connect(workletNode);
        // Note: We don't connect workletNode to destination to avoid audio playback

        workletNodeRef.current = workletNode;

        // Return cleanup function
        return () => {
          if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
          }
        };
      } catch (error) {
        console.error("Failed to start AudioWorklet VAD:", error);
        return null;
      }
    },
    [config, isSupported, loadWorkletModule]
  );

  /**
   * Stop AudioWorklet voice activity detection
   */
  const stopWorkletVAD = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWorkletVAD();
    };
  }, [stopWorkletVAD]);

  return {
    startWorkletVAD,
    stopWorkletVAD,
    isSupported,
  };
}
