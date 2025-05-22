
import React from 'react';

interface AlertProps {
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ message, type = 'error', onClose }) => {
  const baseClasses = "p-4 mb-4 text-sm rounded-lg";
  let specificClasses = "";

  switch (type) {
    case 'success':
      specificClasses = "bg-green-800 text-green-200 border border-green-700";
      break;
    case 'warning':
      specificClasses = "bg-yellow-800 text-yellow-200 border border-yellow-700";
      break;
    case 'info':
      specificClasses = "bg-blue-800 text-blue-200 border border-blue-700";
      break;
    case 'error':
    default:
      specificClasses = "bg-red-800 text-red-200 border border-red-700";
      break;
  }

  return (
    <div className={`${baseClasses} ${specificClasses} flex justify-between items-center`} role="alert">
      <span>{message}</span>
      {onClose && (
         <button 
            onClick={onClose} 
            type="button" 
            className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-current rounded-lg focus:ring-2 focus:ring-current p-1.5 hover:bg-current/20 inline-flex h-8 w-8" 
            aria-label="Close"
          >
          <span className="sr-only">Close</span>
          <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
        </button>
      )}
    </div>
  );
};