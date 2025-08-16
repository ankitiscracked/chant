export interface ActionElement {
  id: string;
  selector: string;
  type:
  | "input"
  | "textarea"
  | "select"
  | "button"
  | "link"
  | "checkbox"
  | "radio"
  | "range"
  | "file"
  | "color"
  | "date"
  | "datetime-local"
  | "email"
  | "month"
  | "number"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week";
  label?: string;
  order?: number;
  value?: string;
  ref?: React.RefObject<HTMLElement>;
  metadata?: Record<string, any>;
  affectsPersistentState?: boolean;
  demoHandler?: () => void | Promise<void>;
}

export interface ExecFunctionResult {
  resultText: string;
  userInfo: string[];
  error: string;
}

export interface UserInfoDisplayEvent extends ExecFunctionResult {
  actionId: string;
}

export type InformationalFunction = () => ExecFunctionResult | Promise<ExecFunctionResult>;
export type ActionCacheFunction = (actionId: string, steps: ActionStep[]) => Promise<Record<string, any>>;

export interface Action {
  actionId: string;
  voice_triggers: string[];
  description: string;
  steps?: string[]; // natural language - made optional
  route?: string; // optional route to couple action to specific app routes
  pauseOnRequiredField?: boolean;
  execFunction?: InformationalFunction;
  cacheFunction?: ActionCacheFunction;
}

export interface ActionStep {
  type: string;
  elementId?: string;
  value?: string;
  url?: string;
  delay?: number;
}

export interface ExecutionState {
  actionId: string | null;
  status: "idle" | "executing" | "paused" | "completed";
  currentActionIndex: number;
  pendingActions: ActionStep[];
  pausedAt?: number;
  remainingActions?: ActionStep[];
  waitingForElement?: {
    elementId: string;
    label?: string;
    reason: string;
  };
  isDemoMode?: boolean;
}

export interface VoiceListenerState {
  status: "listening" | "speaking" | "analyzing" | "planning" | "idle";
  transcript: string;
}

export interface VADConfig {
  threshold: number;
  silenceDuration: number;
}

export interface VADOptions extends VADConfig {
  useWorklet?: boolean;
}

export type VADStrategy = "worklet";

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

export type ValidActionId = string;
