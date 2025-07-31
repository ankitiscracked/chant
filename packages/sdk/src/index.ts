// Core functionality
export { VoiceEngine, ActionDispatcher } from './core';

// React components
export { VoiceListener } from './components';

// React hooks
export { 
  useVoiceRecording, 
  useAudioSession, 
  useVoiceActivityDetection, 
  useAudioProcessing 
} from './hooks';

// Types
export type { 
  VoiceElement, 
  ActionSchema, 
  Action, 
  ExecutionState, 
  VADConfig 
} from './types';

// Utilities and singleton instance
export { voiceEngine } from './utils';

// Convenience API functions (using singleton instance)
export const registerElement = (id: string, meta: import('./types').VoiceElement) => 
  voiceEngine.registerElement(id, meta);

export const registerAction = (id: string, action: import('./types').ActionSchema) => 
  voiceEngine.registerAction(id, action);

export const updateContext = (obj: Record<string, any>) => 
  voiceEngine.updateContext(obj);

export const getExecutionState = () => 
  voiceEngine.getExecutionState();

export const onExecutionStateChange = (callback: (state: import('./types').ExecutionState) => void) => 
  voiceEngine.onExecutionStateChange(callback);

export const transcribeAudio = (audioBase64: string) => 
  voiceEngine.transcribeAudio(audioBase64);

export const handleTranscript = (transcript: string) => 
  voiceEngine.handleTranscript(transcript);