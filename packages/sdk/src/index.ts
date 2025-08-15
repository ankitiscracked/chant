// Core functionality
export { VoiceEngine, ActionDispatcher } from "./core";

// React components
export { VoiceListener } from "./components";

// React hooks
export {
  useVoiceRecording,
  useAudioSession,
  useVoiceActivityDetection,
  useAudioProcessing,
  useVoiceElement,
  useVoiceAction,
  useVoiceActions,
  useUserInfoDisplay,
  useActionSuccessFlow,
} from "./hooks";

// Audio utilities
export { isAudioWorkletSupported, VAD_PROCESSOR_URL } from "./audio";

// Types
export type {
  ActionElement,
  Action,
  ActionStep as ActionSteps,
  ExecutionState,
  VADConfig,
  VADOptions,
  VADStrategy,
  VADCapabilities,
  VoiceSegment,
  VoiceRecordingOptions,
  ExecFunctionResult,
  UserInfoDisplayEvent,
  InformationalFunction,
} from "./types";

// Services
export { ActionCacheService } from "./services/ActionCacheService";

// Utilities and singleton instance
export { voiceEngine } from "./utils";

// Convenience API functions (using singleton instance)
export const registerElement = (
  id: string,
  meta: import("./types").ActionElement,
  actionId?: string
) => voiceEngine.registerElement(id, meta, actionId);

export const registerAction = (id: string, action: import("./types").Action) =>
  voiceEngine.registerAction(id, action);

export const updateContext = (obj: Record<string, any>) =>
  voiceEngine.updateContext(obj);

export const getExecutionState = () => voiceEngine.getExecutionState();

export const onExecutionStateChange = (
  callback: (state: import("./types").ExecutionState) => void
) => voiceEngine.onExecutionStateChange(callback);

export const transcribeAudio = (audioBase64: string) =>
  voiceEngine.transcribeAudio(audioBase64);

export const handleTranscript = (transcript: string) =>
  voiceEngine.handleTranscript(transcript);
