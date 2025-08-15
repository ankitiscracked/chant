import { useState, useEffect } from "react";
import { voiceEngine } from "../utils";
import type { ExecutionState, VoiceListenerState } from "../types";

export const useVoiceState = () => {
  const [executionState, setExecutionState] = useState<ExecutionState>(() =>
    voiceEngine.getExecutionState()
  );
  const [voiceListenerState, setVoiceListenerState] =
    useState<VoiceListenerState>(() => voiceEngine.getVoiceListenerState());

  useEffect(() => {
    const handleExecutionStateChange = (event: CustomEvent<ExecutionState>) => {
      setExecutionState(event.detail);
    };

    const handleVoiceListenerStateChange = (
      event: CustomEvent<VoiceListenerState>
    ) => {
      setVoiceListenerState(event.detail);
    };

    voiceEngine.addEventListener(
      "executionStateChange",
      handleExecutionStateChange as EventListener
    );
    voiceEngine.addEventListener(
      "voiceListenerStateChange",
      handleVoiceListenerStateChange as EventListener
    );

    return () => {
      voiceEngine.removeEventListener(
        "executionStateChange",
        handleExecutionStateChange as EventListener
      );
      voiceEngine.removeEventListener(
        "voiceListenerStateChange",
        handleVoiceListenerStateChange as EventListener
      );
    };
  }, []);

  return {
    executionState,
    voiceListenerState,
    // Convenience getters
    isExecuting: executionState.status === "executing",
    isPaused: executionState.status === "paused",
    isCompleted: executionState.status === "completed",
    isListening: voiceListenerState.status === "listening",
    isSpeaking: voiceListenerState.status === "speaking",
    isAnalyzing: voiceListenerState.status === "analyzing",
    isPlanning: voiceListenerState.status === "planning",
    transcript: voiceListenerState.transcript,
  };
};
