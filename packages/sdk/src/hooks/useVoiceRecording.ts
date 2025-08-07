import { useState, useRef, useEffect } from "react";
import { useAudioSession } from "./useAudioSession";
import { useVoiceActivityDetection } from "./useVoiceActivityDetection";
import { useAudioProcessing } from "./useAudioProcessing";
import type { VADConfig } from "../types";

const MAX_RECORDING_TIME = 30000; // max 30s per segment (fallback)

export function useVoiceRecording(vadConfig?: VADConfig) {
  const [enabled, setEnabled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { audioContext, source, isReady } = useAudioSession(enabled);
  const { startVAD, stopVAD } = useVoiceActivityDetection(vadConfig);
  const { transcript, processAudioChunk } = useAudioProcessing();

  const handleVoiceEnd = async (
    audioBuffer: ArrayBuffer | null | undefined
  ) => {
    if (audioBuffer) {
      const wavBlob = new Blob([audioBuffer], { type: "audio/wav" });
      await processAudioChunk(wavBlob);
    }

    // Clear timeout since voice ended naturally
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startRecording = async () => {
    if (
      !isReady ||
      !audioContext ||
      !source ||
      audioContext.state === "closed"
    ) {
      return;
    }

    try {
      await startVAD(handleVoiceEnd, audioContext, source);

      // Fallback timeout for max recording time
      timeoutRef.current = setTimeout(() => {
        console.log("Max recording time reached");
        stopVAD();
      }, MAX_RECORDING_TIME);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setEnabled(false);
    }
  };

  const stopRecording = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    stopVAD();
  };

  useEffect(() => {
    if (enabled && isReady) {
      startRecording();
    } else if (!enabled) {
      stopRecording();
    }
  }, [enabled, isReady]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const start = () => {
    setEnabled(true);
  };

  const stop = () => {
    setEnabled(false);
  };

  return {
    enabled,
    transcript,
    isRecording: enabled,
    start,
    stop,
  };
}
