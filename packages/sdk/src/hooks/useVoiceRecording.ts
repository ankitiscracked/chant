import { useState, useRef, useEffect } from "react";
import { useAudioSession } from "./useAudioSession";
import { useVoiceActivityDetection } from "./useVoiceActivityDetection";
import { useAudioProcessing } from "./useAudioProcessing";
import type { VADConfig } from "../types";
import { useVoiceEngine } from "../context/VoiceEngineContext";

export function useVoiceRecording(vadConfig?: VADConfig) {
  const voiceEngine = useVoiceEngine();
  const [enabled, setEnabled] = useState(false);

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
    } catch (error) {
      console.error("Failed to start recording:", error);
      setEnabled(false);
    }
  };

  const stopRecording = () => {
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
    voiceEngine.setListening(true);
  };

  const stop = () => {
    setEnabled(false);
    voiceEngine.setListening(false);
  };

  return {
    enabled,
    transcript,
    start,
    stop,
  };
}
