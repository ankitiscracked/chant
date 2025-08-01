import { useRef, useCallback } from "react";
import type { VADOptions, VADCapabilities } from "../types";
import { useAudioWorkletVAD } from "./useAudioWorkletVAD";
import { isAudioWorkletSupported } from "../audio";

export function useVoiceActivityDetection(
  config: VADOptions,
  enabledRef: React.RefObject<boolean>
) {
  const vadStateRef = useRef({
    silenceStart: 0,
    isSpeaking: false,
    isActive: false,
    cleanup: null as (() => void) | null,
    strategy: "worklet" as "worklet",
  });

  // Initialize AudioWorklet VAD hook
  const audioWorkletVAD = useAudioWorkletVAD(config);

  /**
   * Get VAD capabilities for current environment
   */
  const getCapabilities = useCallback((): VADCapabilities => {
    const supportsWorklet = isAudioWorkletSupported();

    return {
      supportsWorklet,
      supportsAnalyser: false,
      recommended: "worklet",
    };
  }, []);

  /**
   * Start VAD using AudioWorklet
   */
  const startVAD = useCallback(
    (
      onSilenceDetected: () => void,
      audioContext?: AudioContext,
      source?: MediaStreamAudioSourceNode
    ) => {
      const capabilities = getCapabilities();

      console.log("capabilities:", capabilities);

      if (!capabilities.supportsWorklet || !audioContext || !source) {
        throw new Error(
          "AudioWorklet is required but not supported or missing audio context/source"
        );
      }

      console.log("Using AudioWorklet VAD strategy");
      vadStateRef.current.strategy = "worklet";

      // Use AudioWorklet VAD
      return audioWorkletVAD.startWorkletVAD(
        audioContext,
        source,
        () => {
          // Voice start - update internal state
          vadStateRef.current.isSpeaking = true;
          console.log("voice start detected");
        },
        () => {
          // Voice end
          vadStateRef.current.isSpeaking = false;
          console.log("voice end detected");
          onSilenceDetected();
        }
      );
    },
    [config, getCapabilities, audioWorkletVAD]
  );

  const stopVAD = useCallback(() => {
    audioWorkletVAD.stopWorkletVAD();
    vadStateRef.current.isActive = false;
  }, [audioWorkletVAD]);

  return {
    startVAD,
    stopVAD,
    getCapabilities,
    currentStrategy: vadStateRef.current.strategy,
  };
}
