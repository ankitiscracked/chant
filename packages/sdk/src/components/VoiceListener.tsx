import { useEffect, useState } from "react";
import { useVoiceRecording } from "../hooks";
import { voiceEngine } from "../utils";
import type { ExecutionState } from "../types";

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

  return (
    <div className="fixed bottom-2.5 right-2.5">
      {!enabled ? (
        <div
          className="bg-yellow-400 p-2.5 rounded-lg cursor-pointer hover:bg-yellow-500 transition-colors"
          onClick={start}
        >
          🎤 Click to activate
        </div>
      ) : (
        <div
          className={`
          ${
            executionState.status === "paused"
              ? "bg-orange-400"
              : "bg-yellow-400"
          } 
          p-2.5 rounded-lg relative
          ${executionState.status === "paused" ? "max-w-[200px] text-xs" : ""}
        `}
        >
          {enabled && (
            <button
              onClick={stop}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
            >
              Stop
            </button>
          )}
          {executionState.status === "paused" &&
          executionState.waitingForElement ? (
            <>
              ⏸️ Waiting for input
              <br />
              <strong>{executionState.waitingForElement.label}</strong>
              <br />
              <em>{executionState.waitingForElement.reason}</em>
              <br />
              <small>Say "continue" or "next" when ready</small>
            </>
          ) : executionState.status === "executing" ? (
            "⚡ Executing..."
          ) : enabled ? (
            "🔴 Recording..."
          ) : (
            "Listening..."
          )}
          <br />
          <em>{transcript}</em>
        </div>
      )}
    </div>
  );
}
