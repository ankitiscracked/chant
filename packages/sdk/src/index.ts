// Core functionality
export { VoiceEngine, ActionDispatcher, EventBus } from "./core";

// React components
export { VoiceListener } from "./components";

// React Context
export {
  VoiceEngineProvider,
  useVoiceEngine,
} from "./context/VoiceEngineContext";

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
  ExecutionStatus as ExecutionState,
  VADConfig,
  VADOptions,
  VADStrategy,
  VADCapabilities,
  VoiceSegment,
  ExecFunctionResult,
  UserInfoDisplayEvent,
  InformationalFunction,
} from "./types";

// Services
export { ActionCacheService } from "./services/ActionCacheService";
