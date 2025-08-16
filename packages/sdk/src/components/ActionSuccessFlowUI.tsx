interface ActionSuccessFlowUIProps {
  transcript: string;
  actionDescription: string;
  onSuccess: () => void;
  onFailure: () => void;
}

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function ActionSuccessFlowUI({
  transcript,
  actionDescription,
  onSuccess,
  onFailure
}: ActionSuccessFlowUIProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckIcon />
        </div>
        <div className="text-xs font-medium text-green-600">
          Action Completed
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div><strong>Command:</strong> "{transcript}"</div>
        <div><strong>Action:</strong> {actionDescription}</div>
      </div>
      <div className="text-sm font-medium mt-2 mb-2">
        Was this action executed successfully?
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSuccess}
          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
        >
          <CheckIcon />
          Yes
        </button>
        <button
          onClick={onFailure}
          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
        >
          <XIcon />
          No
        </button>
      </div>
    </div>
  );
}