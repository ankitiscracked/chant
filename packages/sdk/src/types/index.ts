export interface VoiceElement {
  id: string;
  selector: string;
  type: "input" | "button" | "link";
  label?: string;
  order?: number;
  value?: string;
  ref?: React.RefObject<HTMLElement>;
}

export interface ActionSchema {
  voice_triggers: string[];
  description: string;
  steps: string[]; // natural language
}

export interface Action {
  type: string;
  elementId?: string;
  value?: string;
  url?: string;
  delay?: number;
}

export interface ExecutionState {
  status: 'idle' | 'executing' | 'paused' | 'completed';
  currentActionIndex: number;
  pendingActions: Action[];
  waitingForElement?: {
    elementId: string;
    label?: string;
    reason: string;
  };
}

export interface ExecutionResult {
  completed: boolean;
  pausedAt?: number;
  remainingActions?: Action[];
  waitingForElement?: {
    elementId: string;
    label?: string;
    reason: string;
  };
}

export interface VADConfig {
  threshold: number;
  silenceDuration: number;
}

export interface VADOptions extends VADConfig {
  useWorklet?: boolean;
}

export type VADStrategy = 'worklet';

export interface VADCapabilities {
  supportsWorklet: boolean;
  supportsAnalyser: boolean;
  recommended: VADStrategy;
}

export interface VoiceSegment {
  startTime: number;
  endTime: number;
  duration: number;
  confidence?: number;
}

// Re-export hook interfaces that are part of the public API
export type { VoiceRecordingOptions } from '../hooks/useVoiceRecording';