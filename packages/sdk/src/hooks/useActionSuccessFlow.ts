import { useState, useCallback, useEffect } from 'react';
import { ActionCacheService } from '../services/ActionCacheService';
import type { ActionStep, Action } from '../types';

export interface ActionSuccessFlowState {
  showSuccessDialog: boolean;
  showTriggerSuggestions: boolean;
  currentActionId: string | null;
  currentActionDescription: string;
  currentTranscript: string;
  currentSteps: ActionStep[];
  availableTriggers: string[];
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

export function useActionSuccessFlow(): [ActionSuccessFlowState, ActionSuccessFlowActions] {
  const [state, setState] = useState<ActionSuccessFlowState>({
    showSuccessDialog: false,
    showTriggerSuggestions: false,
    currentActionId: null,
    currentActionDescription: '',
    currentTranscript: '',
    currentSteps: [],
    availableTriggers: []
  });

  const handleActionCompleted = useCallback((
    actionId: string, 
    actionDescription: string,
    transcript: string, 
    steps: ActionStep[]
  ) => {
    setState(prev => ({
      ...prev,
      showSuccessDialog: true,
      showTriggerSuggestions: false,
      currentActionId: actionId,
      currentActionDescription: actionDescription,
      currentTranscript: transcript,
      currentSteps: steps,
      availableTriggers: []
    }));
  }, []);

  const handleSuccess = useCallback(async () => {
    if (state.currentActionId && state.currentSteps.length > 0) {
      try {
        await actionCacheService.cacheSuccessfulAction(
          state.currentActionId,
          state.currentSteps,
          state.currentTranscript
        );
        console.log('Action cached successfully:', state.currentActionId);
      } catch (error) {
        console.error('Failed to cache action:', error);
      }
    }
    
    setState(prev => ({
      ...prev,
      showSuccessDialog: false,
      currentActionId: null,
      currentActionDescription: '',
      currentTranscript: '',
      currentSteps: [],
      availableTriggers: []
    }));
  }, [state.currentActionId, state.currentSteps, state.currentTranscript]);

  const handleFailure = useCallback((availableTriggers: string[]) => {
    setState(prev => ({
      ...prev,
      showSuccessDialog: false,
      showTriggerSuggestions: true,
      availableTriggers
    }));
  }, []);

  const handleRetry = useCallback((trigger: string) => {
    // Dispatch custom event for voice engine to handle retry
    const retryEvent = new CustomEvent('actionRetry', {
      detail: {
        actionId: state.currentActionId,
        suggestedTrigger: trigger,
        originalTranscript: state.currentTranscript
      }
    });
    window.dispatchEvent(retryEvent);
    
    setState(prev => ({
      ...prev,
      showTriggerSuggestions: false,
      currentActionId: null,
      currentActionDescription: '',
      currentTranscript: '',
      currentSteps: [],
      availableTriggers: []
    }));
  }, [state.currentActionId, state.currentTranscript]);

  const dismissDialogs = useCallback(() => {
    setState(prev => ({
      ...prev,
      showSuccessDialog: false,
      showTriggerSuggestions: false,
      currentActionId: null,
      currentActionDescription: '',
      currentTranscript: '',
      currentSteps: [],
      availableTriggers: []
    }));
  }, []);

  return [
    state,
    {
      handleActionCompleted,
      handleSuccess,
      handleFailure,
      handleRetry,
      dismissDialogs
    }
  ];
}

// Export the cache service for use in other parts of the application
export { actionCacheService };