import { useEffect, useState } from "react";
import { useVoiceRecording } from "../hooks";
import { useVoiceState } from "../hooks/useVoiceState";
import { useUserInfoDisplay } from "../hooks";
import { useActionSuccessFlow } from "../hooks/useActionSuccessFlow";
import { useVoiceEngine } from "../context/VoiceEngineContext";
import { EventBus } from "../core/EventBus";
import { UserInfoDisplay } from "./UserInfoDisplay";
import { ActionSuccessFlowUI } from "./ActionSuccessFlowUI";
import { ActionTriggerSuggestionsUI } from "./ActionTriggerSuggestionsUI";

// Icon components
const WaveformIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 3V21M8 6V18M16 6V18M4 10V14M20 10V14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const ListeningIcon = () => (
  <svg viewBox="0 0 64 64" width="40" height="40">
    <path
      id="wave"
      d="M 0 32 Q 8 28, 16 32 T 32 32 T 48 32 T 64 32"
      stroke="#4CAF50"
      strokeWidth="2"
      fill="none"
    >
      <animate
        attributeName="d"
        dur={"1.2s"}
        repeatCount="indefinite"
        values="
          M 0 32 Q 8 28, 16 32 T 32 32 T 48 32 T 64 32;
          M 0 32 Q 8 24, 16 32 T 32 40 T 48 24 T 64 32;
          M 0 32 Q 8 28, 16 32 T 32 32 T 48 32 T 64 32"
      />
    </path>
  </svg>
);

// Recording: Pulsing red dot
const RecordingIcon = () => (
  <svg viewBox="0 0 64 64" width="40" height="40">
    <circle cx="32" cy="32" r="10" fill="#F44336">
      <animate
        attributeName="r"
        values="10;14;10"
        dur={"1.2s"}
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

// Analysing: Hovering magnifying glass
export const AnalysingIcon = () => (
  <svg viewBox="0 0 64 64" width="40" height="40">
    <g>
      <circle
        cx="28"
        cy="28"
        r="10"
        stroke="#2196F3"
        strokeWidth="2"
        fill="none"
      />
      <line x1="35" y1="35" x2="44" y2="44" stroke="#2196F3" strokeWidth="2" />
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0 0; 0 -2; 0 0; 0 2; 0 0"
        dur="2s"
        repeatCount="indefinite"
      />
    </g>
  </svg>
);

// Executing: Tiny line through maze
export const PlanningIcon = () => (
  <svg viewBox="0 0 64 64" width="40" height="40">
    {/* Chip outline */}
    <rect
      x="12"
      y="12"
      width="40"
      height="40"
      stroke="#9C27B0"
      strokeWidth="2"
      fill="none"
    />
    {/* Simple "tracks" */}
    <path
      d="M16 16 H48 V48 H16 V32 H32 V48"
      stroke="#9C27B0"
      strokeWidth="2"
      fill="none"
    />
    {/* Moving dot along the path */}
    <circle r="2" fill="#9C27B0">
      <animateMotion
        dur="2s"
        repeatCount="indefinite"
        path="M16 16 H48 V48 H16 V32 H32 V48"
      />
    </circle>
  </svg>
);

// Executing: Shifting arrow
const ExecutingIcon = () => (
  <svg viewBox="0 0 64 64" width="40" height="40">
    <polygon points="20,16 44,32 20,48" fill="#9C27B0">
      <animate
        attributeName="points"
        values="
          20,16 44,32 20,48;
          24,16 48,32 24,48;
          20,16 44,32 20,48"
        dur={"1.2s"}
        repeatCount="indefinite"
      />
    </polygon>
  </svg>
);

const PauseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M10 15V9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 15V9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CompletedIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M9 12L11 14L15 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface StateConfig {
  icon: React.ReactNode;
  label: string;
  className: string;
}

export function VoiceListener() {
  const voiceEngine = useVoiceEngine();

  const [hasActions, setHasActions] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);
  const [showNoMatchWarning, setShowNoMatchWarning] = useState(false);
  const [showNoElementsWarning, setShowNoElementsWarning] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");

  const { executionState, voiceListenerState, isPaused, isCompleted } =
    useVoiceState();
  const { enabled, transcript, start, stop } = useVoiceRecording();
  const { displayData, isVisible, dismiss } = useUserInfoDisplay();

  const [successFlowState, successFlowActions] = useActionSuccessFlow();

  // Handle completion state reset
  useEffect(() => {
    if (isCompleted) {
      // Reset to idle state
      voiceEngine.updateExecutionState({ status: "idle" });
      voiceEngine.updateVoiceListenerState({
        status: "listening",
        transcript: "",
      });
    }
  }, [isCompleted]);

  // Listen for warning events from voice engine
  useEffect(() => {
    const handleNoMatchWarning = (event: Event) => {
      const customEvent = event as CustomEvent;
      setLastTranscript(customEvent.detail.transcript || "");
      setShowNoMatchWarning(true);
      setTimeout(() => setShowNoMatchWarning(false), 4000);
    };

    const handleNoElementsWarning = (event: Event) => {
      setShowNoElementsWarning(true);
      setTimeout(() => setShowNoElementsWarning(false), 4000);
    };

    EventBus.getInstance().addEventListener(
      "noMatchWarning",
      handleNoMatchWarning
    );
    EventBus.getInstance().addEventListener(
      "noElementsWarning",
      handleNoElementsWarning
    );

    return () => {
      EventBus.getInstance().removeEventListener(
        "noMatchWarning",
        handleNoMatchWarning
      );
      EventBus.getInstance().removeEventListener(
        "noElementsWarning",
        handleNoElementsWarning
      );
    };
  }, []);

  // Listen for action retry events
  useEffect(() => {
    const handleActionRetry = (event: CustomEvent) => {
      const { suggestedTrigger } = event.detail;
      // Simulate voice command with the suggested trigger
      voiceEngine.handleTranscript(suggestedTrigger);
    };

    window.addEventListener("actionRetry", handleActionRetry as EventListener);

    return () => {
      window.removeEventListener(
        "actionRetry",
        handleActionRetry as EventListener
      );
    };
  }, []);

  // Track route changes and update voice engine
  useEffect(() => {
    const updateRoute = () => {
      const newRoute = window.location.pathname;
      setCurrentRoute(newRoute);
      voiceEngine.setCurrentRoute(newRoute);
      setHasActions(voiceEngine.hasActionsForCurrentRoute());
    };

    updateRoute();
    window.addEventListener("popstate", updateRoute);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(updateRoute, 0);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updateRoute, 0);
    };

    return () => {
      window.removeEventListener("popstate", updateRoute);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    const checkActions = () =>
      setHasActions(voiceEngine.hasActionsForCurrentRoute());
    const interval = setInterval(checkActions, 1000);
    return () => clearInterval(interval);
  }, [currentRoute]);

  // Determine current state and config
  const getStateConfig = (): StateConfig => {
    const isIdle = !enabled;

    if (isIdle) {
      return {
        icon: <WaveformIcon />,
        label: "Activate voice command",
        className:
          "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
      };
    }

    // Check execution states first
    if (executionState.status === "executing") {
      return {
        icon: <ExecutingIcon />,
        label: "Executing",
        className: "",
      };
    }

    if (executionState.status === "paused") {
      return {
        icon: <PauseIcon />,
        label: "Paused",
        className: "bg-yellow-500 text-yellow-50 border-yellow-500",
      };
    }

    if (executionState.status === "completed") {
      return {
        icon: <CompletedIcon />,
        label: "Completed",
        className: "",
      };
    }

    // Check voice listener states
    switch (voiceListenerState.status) {
      case "listening":
        return {
          icon: <ListeningIcon />,
          label: "Listening...",
          className: "",
        };
      case "speaking":
        return {
          icon: <RecordingIcon />,
          label: "Speaking...",
          className: "",
        };
      case "analyzing":
        return {
          icon: <AnalysingIcon />,
          label: "Analyzing...",
          className: "",
        };
      case "planning":
        return {
          icon: <PlanningIcon />,
          label: "Planning...",
          className: "",
        };
      default:
        return {
          icon: <ListeningIcon />,
          label: "Listening...",
          className: "",
        };
    }
  };

  const stateConfig = getStateConfig();
  const isIdle = !enabled;
  console.log("voice listener state", voiceListenerState);

  // Check if we have additional info to show
  const hasTranscript = transcript || voiceListenerState.transcript;
  const hasPauseInfo = isPaused && executionState.waitingForElement;
  const hasNoActions = !hasActions;
  const hasWarnings = showNoMatchWarning || showNoElementsWarning;
  const hasUserInfo = isVisible && displayData;
  const hasSuccessFlow =
    successFlowState.showSuccessFlow || successFlowState.showTriggerSuggestions;
  const hasAdditionalInfo =
    hasTranscript ||
    hasPauseInfo ||
    hasNoActions ||
    hasWarnings ||
    hasUserInfo ||
    hasSuccessFlow;

  return (
    <div className="fixed z-50 bottom-6 right-6">
      {/* Additional info above the main button */}
      {!isIdle && hasAdditionalInfo && (
        <div className="max-w-xs p-3 mb-3 overflow-y-auto border rounded-lg shadow-lg bg-card text-card-foreground border-border max-h-96">
          {hasTranscript && (
            <div className="mb-2">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Transcript
              </div>
              <div className="text-sm">"{hasTranscript}"</div>
            </div>
          )}

          {hasPauseInfo && (
            <div className="mb-2">
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Waiting for input
              </div>
              <div className="text-sm font-medium">
                {executionState.waitingForElement?.label}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {executionState.waitingForElement?.reason}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Say "continue" or "next" when ready
              </div>
            </div>
          )}

          {hasNoActions && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                No actions available
              </div>
              <div className="text-sm">
                No voice actions registered for this route
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Current route: {currentRoute}
              </div>
            </div>
          )}

          {showNoMatchWarning && (
            <div>
              <div className="mb-1 text-xs font-medium text-red-500">
                Voice command not recognized
              </div>
              <div className="text-sm">"{lastTranscript}"</div>
              <div className="mt-1 text-xs text-muted-foreground">
                No matching action found for this command
              </div>
            </div>
          )}

          {showNoElementsWarning && (
            <div className="mb-2">
              <div className="mb-1 text-xs font-medium text-yellow-600">
                No interactive elements
              </div>
              <div className="text-sm">
                Action matched but no elements registered
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Please ensure UI elements are properly registered
              </div>
            </div>
          )}

          {hasUserInfo && (
            <UserInfoDisplay displayData={displayData} onDismiss={dismiss} />
          )}

          {/* Success flow UI */}
          {successFlowState.showSuccessFlow && (
            <ActionSuccessFlowUI
              transcript={successFlowState.currentTranscript}
              actionDescription={successFlowState.currentActionDescription}
              onSuccess={successFlowActions.handleSuccess}
              onFailure={() => {
                const action = voiceEngine
                  .getActions()
                  .get(successFlowState.currentActionId!);
                const triggers = action?.voice_triggers || [];
                successFlowActions.handleFailure(triggers);
              }}
            />
          )}

          {/* Trigger suggestions UI */}
          {successFlowState.showTriggerSuggestions && (
            <ActionTriggerSuggestionsUI
              actionDescription={successFlowState.currentActionDescription}
              availableTriggers={successFlowState.availableTriggers}
              onRetry={successFlowActions.handleRetry}
              onDismiss={successFlowActions.dismissDialogs}
            />
          )}
        </div>
      )}

      {/* Main state button */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`
    group bg-white cursor-pointer shadow-lg hover:shadow-xl
    flex items-center overflow-hidden
    transition-[width,border-radius,padding,box-shadow]
    ${isIdle ? "duration-150 ease-out" : "duration-200 ease-in-out"}
    ${
      isIdle
        ? "w-12 hover:w-max h-12 rounded-full hover:rounded-2xl px-0 hover:px-3 py-0 justify-center hover:justify-start"
        : "w-max h-12 rounded-2xl px-4 py-3 space-x-3"
    }
    ${stateConfig.className}
  `}
          onClick={isIdle ? start : undefined}
        >
          <div className="flex-shrink-0">{stateConfig.icon}</div>

          {/* Label fades in */}
          <span
            className={`
      text-sm font-medium whitespace-nowrap
      transition-opacity
      ${isIdle ? "duration-150 ease-out" : "duration-200 ease-in-out"}
      ${
        isIdle
          ? "w-0 opacity-0 group-hover:opacity-100 group-hover:w-auto"
          : "w-auto opacity-100"
      }
    `}
          >
            {stateConfig.label}
          </span>

          {/* Stop button only visible in listening state */}
          {voiceListenerState.status === "listening" && (
            <button
              onClick={stop}
              className="flex items-center justify-center flex-shrink-0 w-6 h-6 text-white transition-colors duration-200 ease-in-out bg-gray-800 rounded-full cursor-pointer "
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
        <a
          className="text-[11px] text-gray-300"
          href="https://www.google.com"
          target="_blank"
        >
          Powered by Chant
        </a>
      </div>
    </div>
  );
}
