import { useEffect, useState } from "react";
import { useVoiceEngine } from "../context/VoiceEngineContext";
import { EventBus } from "../core/EventBus";
import { ActionCacheService } from "../services/ActionCacheService";
import type { ActionStep } from "../types";

export interface ActionSuccessFlowState {
  showSuccessFlow: boolean;
  showTriggerSuggestions: boolean;
  currentActionId: string | null;
  currentActionDescription: string;
  currentTranscript: string;
  currentSteps: ActionStep[];
  availableTriggers: string[];
  waitingForFeedback: boolean;
}

export interface ActionSuccessFlowActions {
  handleActionCompleted: (
    actionId: string,
    actionDescription: string,
    transcript: string,
    steps: ActionStep[]
  ) => void;
  handleSuccess: () => void;
  handleFailure: (availableTriggers: string[]) => void;
  handleRetry: (trigger: string) => void;
  dismissDialogs: () => void;
}

const actionCacheService = new ActionCacheService();

export function useActionSuccessFlow(): [
  ActionSuccessFlowState,
  ActionSuccessFlowActions
] {
  const voiceEngine = useVoiceEngine();

  const [state, setState] = useState<ActionSuccessFlowState>({
    showSuccessFlow: false,
    showTriggerSuggestions: false,
    currentActionId: null,
    currentActionDescription: "",
    currentTranscript: "",
    currentSteps: [],
    availableTriggers: [],
    waitingForFeedback: false,
  });

  const handleActionCompleted = (
    actionId: string,
    actionDescription: string,
    transcript: string,
    steps: ActionStep[]
  ) => {
    setState((prev) => ({
      ...prev,
      showSuccessFlow: true,
      showTriggerSuggestions: false,
      currentActionId: actionId,
      currentActionDescription: actionDescription,
      currentTranscript: transcript,
      currentSteps: steps,
      availableTriggers: [],
      waitingForFeedback: true,
    }));
  };

  const handleSuccess = async () => {
    if (state.currentActionId && state.currentSteps.length > 0) {
      try {
        const action = voiceEngine.getActions().get(state.currentActionId!);
        const actionElements = voiceEngine.getElementsByActionId(
          state.currentActionId
        );
        await actionCacheService.cacheSuccessfulAction(
          action!,
          actionElements,
          state.currentSteps
        );
      } catch (error) {
        console.error("Failed to cache action:", error);
      }
    }

    setState((prev) => ({
      ...prev,
      showSuccessFlow: false,
      currentActionId: null,
      currentActionDescription: "",
      currentTranscript: "",
      currentSteps: [],
      availableTriggers: [],
      waitingForFeedback: false,
    }));
  };

  const handleFailure = (availableTriggers: string[]) => {
    setState((prev) => ({
      ...prev,
      showSuccessFlow: false,
      showTriggerSuggestions: true,
      availableTriggers,
      waitingForFeedback: false,
    }));
  };

  const handleRetry = (trigger: string) => {
    // Dispatch custom event for voice engine to handle retry
    const retryEvent = new CustomEvent("actionRetry", {
      detail: {
        actionId: state.currentActionId,
        suggestedTrigger: trigger,
        originalTranscript: state.currentTranscript,
      },
    });
    window.dispatchEvent(retryEvent);

    setState((prev) => ({
      ...prev,
      showSuccessFlow: false,
      showTriggerSuggestions: false,
      currentActionId: null,
      currentActionDescription: "",
      currentTranscript: "",
      currentSteps: [],
      availableTriggers: [],
      waitingForFeedback: false,
    }));
  };

  const dismissDialogs = () => {
    setState((prev) => ({
      ...prev,
      showSuccessFlow: false,
      showTriggerSuggestions: false,
      currentActionId: null,
      currentActionDescription: "",
      currentTranscript: "",
      currentSteps: [],
      availableTriggers: [],
      waitingForFeedback: false,
    }));
  };

  // Register for action completed events
  useEffect(() => {
    const handleActionsCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      console.log("actionsCompleted event received:", customEvent.detail);
      const { actions } = customEvent.detail;
      // Get current execution state to find the action
      const executionState = voiceEngine.getExecutionState();
      const voiceListenerState = voiceEngine.getVoiceListenerState();

      if (executionState.actionId) {
        const action = voiceEngine.getActions().get(executionState.actionId);
        if (action) {
          handleActionCompleted(
            executionState.actionId,
            action.description,
            voiceListenerState.transcript,
            actions
          );
        }
      }
    };

    console.log("Registering actionsCompleted event listener");
    EventBus.getInstance().addEventListener(
      "actionsCompleted",
      handleActionsCompleted
    );

    return () => {
      console.log("Unregistering actionsCompleted event listener");
      EventBus.getInstance().removeEventListener(
        "actionsCompleted",
        handleActionsCompleted
      );
    };
  }, [voiceEngine]);

  return [
    state,
    {
      handleActionCompleted,
      handleSuccess,
      handleFailure,
      handleRetry,
      dismissDialogs,
    },
  ];
}

// Export the cache service for use in other parts of the application
export { actionCacheService };
