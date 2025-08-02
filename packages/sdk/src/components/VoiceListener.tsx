import { useEffect, useState } from "react";
import { useVoiceRecording } from "../hooks";
import { voiceEngine } from "../utils";
import type { ExecutionState } from "../types";

// Icons as React components
const CrystalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      opacity="0.8"
    />
  </svg>
);

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
      fill="currentColor"
    />
    <path
      d="M19 10V12C19 16.42 15.42 20 11 20H13C17.42 20 21 16.42 21 12V10H19Z"
      fill="currentColor"
    />
    <path d="M7 23H17V21H7V23Z" fill="currentColor" />
  </svg>
);

const WaitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Animated components
const Waveform = () => (
  <div className="flex items-center space-x-1">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="w-1 bg-current rounded-full animate-pulse"
        style={{
          height: '12px',
          animationDelay: `${i * 0.1}s`,
          animationDuration: '1.2s'
        }}
      />
    ))}
  </div>
);

const StepsDots = () => (
  <div className="flex items-center justify-center space-x-1 mt-2">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="w-2 h-2 bg-current rounded-full opacity-50"
        style={{
          animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
        }}
      />
    ))}
  </div>
);

export function VoiceListener() {
  const [executionState, setExecutionState] = useState<ExecutionState>(
    voiceEngine.getExecutionState()
  );

  // Use custom hook for all voice recording logic
  const { enabled, transcript, start, stop } = useVoiceRecording();

  useEffect(() => {
    const unsubscribe = voiceEngine.onExecutionStateChange(setExecutionState);
    return unsubscribe;
  }, []);

  const getStateInfo = () => {
    if (!enabled) {
      return {
        bg: 'bg-slate-100 hover:bg-slate-200',
        text: 'text-slate-700',
        icon: <CrystalIcon />,
        label: 'Click to activate'
      };
    }

    if (executionState.status === "paused" && executionState.waitingForElement) {
      return {
        bg: 'bg-amber-100 border-amber-300',
        text: 'text-amber-800',
        icon: <WaitIcon />,
        label: 'Waiting for input'
      };
    }

    if (executionState.status === "executing") {
      return {
        bg: 'bg-blue-100 border-blue-300',
        text: 'text-blue-800',
        icon: <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />,
        label: 'Executing'
      };
    }

    return {
      bg: 'bg-green-100 border-green-300',
      text: 'text-green-800',
      icon: <MicIcon />,
      label: 'Listening'
    };
  };

  const stateInfo = getStateInfo();
  const isExpanded = enabled && (executionState.status === "executing" || (executionState.status === "paused" && executionState.waitingForElement));

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
          } 40% { 
            transform: scale(1);
          }
        }
      `}</style>

      <div
        className={`
          group relative cursor-pointer
          ${stateInfo.bg} ${stateInfo.text}
          border border-opacity-20 shadow-lg hover:shadow-xl
          ${!enabled ? 'w-12 h-12 hover:px-4 hover:py-3 rounded-full hover:w-full hover:rounded-2xl' :
            isExpanded ? 'rounded-2xl px-6 py-4 min-w-[280px]' :
              'rounded-full px-4 py-3'
          }
        `}
        onClick={!enabled ? start : undefined}
      >
        {!enabled ? (
          <div className="flex h-full items-center justify-center group-hover:space-x-2">
            <div className="flex-shrink-0">
              {stateInfo.icon}
            </div>
            <span className="text-sm font-medium hidden group-hover:block">
              {stateInfo.label}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {executionState.status === "executing" ? (
                  stateInfo.icon
                ) : enabled && executionState.status !== "paused" ? (
                  <Waveform />
                ) : (
                  stateInfo.icon
                )}
                <div>
                  <div className="text-sm font-semibold">
                    {stateInfo.label}
                  </div>
                  {transcript && (
                    <div className="text-xs opacity-75 mt-1 max-w-[200px] truncate">
                      "{transcript}"
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={stop}
                className="flex-shrink-0 w-8 h-8 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full flex items-center justify-center transition-colors font-medium"
              >
                ✕
              </button>
            </div>

            {isExpanded && (
              <div className="pt-2 border-t border-current border-opacity-20">
                {executionState.status === "paused" && executionState.waitingForElement && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {executionState.waitingForElement.label}
                    </div>
                    <div className="text-xs opacity-75">
                      {executionState.waitingForElement.reason}
                    </div>
                    <div className="text-xs opacity-60">
                      Say "continue" or "next" when ready
                    </div>
                  </div>
                )}

                {executionState.status === "executing" && (
                  <div className="text-center">
                    <div className="text-xs opacity-75 mb-2">Processing your request...</div>
                    <StepsDots />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
