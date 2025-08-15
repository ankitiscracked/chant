interface UserInfoData {
  error?: string;
  resultText?: string;
  userInfo: string[];
}

interface UserInfoDisplayProps {
  displayData: UserInfoData;
  onDismiss: () => void;
}

export function UserInfoDisplay({ displayData, onDismiss }: UserInfoDisplayProps) {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs font-medium text-muted-foreground">Information</div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-2">
        {displayData.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="text-xs font-medium text-red-800 mb-1">Error</div>
            <div className="text-xs text-red-700">{displayData.error}</div>
          </div>
        )}
        
        {displayData.resultText && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-xs font-medium text-blue-800 mb-1">Result</div>
            <div className="text-xs text-blue-700">{displayData.resultText}</div>
          </div>
        )}
        
        {displayData.userInfo.length > 0 && (
          <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
            <div className="text-xs font-medium text-gray-800 mb-1">Details</div>
            <ul className="space-y-1">
              {displayData.userInfo.map((info, index) => (
                <li key={index} className="text-xs text-gray-700 flex items-start">
                  <span className="text-gray-400 mr-1">•</span>
                  <span>{info}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}