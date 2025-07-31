import { useRef, useCallback } from "react";
import type { VADConfig } from '../types';

export function useVoiceActivityDetection(
  analyser: AnalyserNode | null,
  config: VADConfig,
  enabledRef: React.RefObject<boolean>
) {
  const vadStateRef = useRef({
    silenceStart: 0,
    isSpeaking: false,
    isActive: false,
    cleanup: null as (() => void) | null
  });

  const startVAD = useCallback((onSilenceDetected: () => void) => {
    if (!analyser) return null;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    vadStateRef.current.isActive = true;

    const checkAudioLevel = () => {
      if (!vadStateRef.current.isActive || !enabledRef.current) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

      if (average > config.threshold) {
        // Voice detected
        if (!vadStateRef.current.isSpeaking) {
          vadStateRef.current.isSpeaking = true;
        }
        vadStateRef.current.silenceStart = Date.now();
      } else {
        // Silence detected
        if (
          vadStateRef.current.isSpeaking &&
          Date.now() - vadStateRef.current.silenceStart > config.silenceDuration
        ) {
          vadStateRef.current.isSpeaking = false;
          onSilenceDetected();
          return;
        }
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();

    const cleanup = () => {
      vadStateRef.current.isActive = false;
    };

    vadStateRef.current.cleanup = cleanup;
    return cleanup;
  }, [analyser, config, enabledRef]);

  const stopVAD = useCallback(() => {
    if (vadStateRef.current.cleanup) {
      vadStateRef.current.cleanup();
      vadStateRef.current.cleanup = null;
    }
  }, []);

  return { startVAD, stopVAD };
}