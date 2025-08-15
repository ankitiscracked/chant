import { useState, useEffect } from 'react';

interface ActionSuccessDialogProps {
  isVisible: boolean;
  actionId: string;
  actionDescription: string;
  transcript: string;
  onSuccess: () => void;
  onFailure: () => void;
  onDismiss: () => void;
}

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function ActionSuccessDialog({
  isVisible,
  actionId,
  actionDescription,
  transcript,
  onSuccess,
  onFailure,
  onDismiss
}: ActionSuccessDialogProps) {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!isVisible) {
      setTimeLeft(10);
      return;
    }

    // Auto-dismiss after 10 seconds, considering it successful
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onSuccess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, onSuccess]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onDismiss}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 border">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckIcon />
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900">
            Action Completed
          </h3>
          
          {/* Content */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Command:</strong> "{transcript}"
            </p>
            <p className="text-sm text-gray-600">
              <strong>Action:</strong> {actionDescription}
            </p>
          </div>
          
          {/* Question */}
          <p className="text-base text-gray-800">
            Was this action executed successfully?
          </p>
          
          {/* Auto-dismiss countdown */}
          <p className="text-xs text-gray-500">
            Auto-confirming as successful in {timeLeft}s
          </p>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onSuccess}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckIcon />
              Yes, successful
            </button>
            
            <button
              onClick={onFailure}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XIcon />
              No, failed
            </button>
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}