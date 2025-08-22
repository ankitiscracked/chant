import { useState, useEffect } from "react";

interface ActionTriggerSuggestionsProps {
  isVisible: boolean;
  actionId: string;
  actionDescription: string;
  availableTriggers: string[];
  onRetry: (trigger: string) => void;
  onDismiss: () => void;
}

const MicIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15S15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M19 10V12C19 16.97 14.97 21 10 21H14C18.97 21 23 16.97 23 12V10"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M12 19V23" stroke="currentColor" strokeWidth="2" />
    <path d="M8 23H16" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M21 3V7H17" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export function ActionTriggerSuggestions({
  isVisible,
  actionId,
  actionDescription,
  availableTriggers,
  onRetry,
  onDismiss,
}: ActionTriggerSuggestionsProps) {
  const [selectedTrigger, setSelectedTrigger] = useState<string>("");

  useEffect(() => {
    if (isVisible && availableTriggers.length > 0) {
      setSelectedTrigger(availableTriggers[0]!);
    }
  }, [isVisible, availableTriggers]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Dialog */}
      <div className="relative max-w-md p-6 mx-4 bg-white border shadow-2xl rounded-xl">
        <div className="flex flex-col space-y-4">
          {/* Icon & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 text-orange-600 bg-orange-100 rounded-full">
              <RefreshIcon />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Action Failed
              </h3>
              <p className="text-sm text-gray-500">
                Let's try again with a different command
              </p>
            </div>
          </div>

          {/* Action Info */}
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="text-sm text-gray-600">
              <strong>Action:</strong> {actionDescription}
            </p>
          </div>

          {/* Suggestion text */}
          <p className="text-sm text-gray-700">
            Try one of these voice commands instead:
          </p>

          {/* Trigger options */}
          <div className="space-y-2">
            {availableTriggers.map((trigger, index) => (
              <label
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="trigger"
                  value={trigger}
                  checked={selectedTrigger === trigger}
                  onChange={(e) => setSelectedTrigger(e.target.value)}
                  className="text-blue-600"
                />
                <div className="flex items-center gap-2 text-sm">
                  <MicIcon />
                  <span className="font-medium">"{trigger}"</span>
                </div>
              </label>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onRetry(selectedTrigger)}
              disabled={!selectedTrigger}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MicIcon />
              Try this command
            </button>

            <button
              onClick={onDismiss}
              className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
