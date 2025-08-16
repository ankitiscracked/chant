import { useEffect, useState } from "react";
import { useVoiceEngine } from "../context/VoiceEngineContext";
import { EventBus } from "../core/EventBus";
import type { ExecutionState, VoiceListenerState } from "../types";

export const useVoiceState = () => {
  const voiceEngine = useVoiceEngine();
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

    EventBus.getInstance().addEventListener(
      "executionStateChange",
      handleExecutionStateChange as EventListener
    );
    EventBus.getInstance().addEventListener(
      "voiceListenerStateChange",
      handleVoiceListenerStateChange as EventListener
    );

    return () => {
      EventBus.getInstance().removeEventListener(
        "executionStateChange",
        handleExecutionStateChange as EventListener
      );
      EventBus.getInstance().removeEventListener(
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
