interface ActionTriggerSuggestionsUIProps {
  actionDescription: string;
  availableTriggers: string[];
  onRetry: (trigger: string) => void;
  onDismiss: () => void;
}

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3" stroke="currentColor" strokeWidth="2"/>
    <path d="M21 3V7H17" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const MicIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15S15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M19 10V12C19 16.97 14.97 21 10 21H14C18.97 21 23 16.97 23 12V10" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 19V23" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 23H16" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export function ActionTriggerSuggestionsUI({
  actionDescription,
  availableTriggers,
  onRetry,
  onDismiss
}: ActionTriggerSuggestionsUIProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
          <RefreshIcon />
        </div>
        <div className="text-xs font-medium text-orange-600">
          Action Failed
        </div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        <strong>Action:</strong> {actionDescription}
      </div>
      <div className="text-sm font-medium mb-2">
        Try one of these commands instead:
      </div>
      <div className="space-y-1 mb-2">
        {availableTriggers.map((trigger, index) => (
          <button
            key={index}
            onClick={() => onRetry(trigger)}
            className="flex items-center gap-2 w-full p-2 border rounded hover:bg-gray-50 text-xs text-left transition-colors"
          >
            <MicIcon />
            <span>"{trigger}"</span>
          </button>
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}