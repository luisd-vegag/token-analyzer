import React, { useState, useEffect, useRef } from 'react';
import { Spinner } from './Spinner';
import { Alert } from './Alert';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  isStreaming?: boolean;
  error?: boolean;
  tokenDetails?: ChatTokenDetails | null;
}

// Updated to include cached tokens, matches AppChatTokenDetails
export interface ChatTokenDetails {
  lastTurnPromptTokens: number;
  lastTurnCandidateTokens: number;
  lastTurnTotalTokens: number;
  lastTurnCachedInputTokens: number; // Added
  sessionPromptTokens: number;
  sessionCandidateTokens: number;
  sessionTotalTokens: number;
  sessionCachedInputTokens: number; // Added
}

interface ChatBoxProps {
  title: string;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isDisabled: boolean;
  placeholderText?: string;
  error: string | null;
  onCloseError: () => void;
  onCancel?: () => void;
  tokenDetails?: ChatTokenDetails | null;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  title,
  messages,
  onSendMessage,
  isLoading,
  isDisabled,
  placeholderText = "Type your message...",
  error,
  onCloseError,
  onCancel,
  tokenDetails
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (force: boolean = false) => {
    if (messagesEndRef.current && chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const atBottomThreshold = 100; 
      const isAtBottom = scrollHeight - scrollTop - clientHeight <= atBottomThreshold;

      if (force || isAtBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const shouldForceScroll = lastMessage.role === 'model' || (lastMessage.role === 'user' && messages.length === 1);
      scrollToBottom(shouldForceScroll);
    }
  }, [messages]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim() || isLoading || isDisabled) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
    scrollToBottom(true);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event as unknown as React.FormEvent);
    }
  };

  let emptyStateMessage = "No messages yet. Send a message to start the conversation!";
  if (isDisabled) {
    emptyStateMessage = placeholderText; 
  }


  return (
    <div className="flex flex-col h-full bg-slate-850 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
      <header className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      </header>

      {error && (
        <div className="p-2">
          <Alert message={error} type="error" onClose={onCloseError} />
        </div>
      )}

      <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-slate-900/30 min-h-[200px] max-h-[350px]">
        {messages.length === 0 && !isLoading && (
          <p className="text-slate-500 text-center py-4">
            {emptyStateMessage}
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-xl shadow ${
                msg.role === 'user'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-700 text-slate-200'
              } ${msg.error ? 'border border-red-500' : ''}`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}{msg.isStreaming && <span className="inline-block w-2 h-2 ml-1 bg-slate-400 rounded-full animate-pulse"></span>}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 border-t border-slate-700 bg-slate-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={isDisabled ? placeholderText : "Type your message..."}
            rows={1}
            className="flex-grow p-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors text-gray-200 placeholder-slate-500 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isDisabled || isLoading}
            aria-label="Chat message input"
          />
          {isLoading && onCancel && (
             <button
              type="button"
              onClick={onCancel}
              className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-md shadow-md transition-colors flex items-center justify-center shrink-0"
              aria-label="Cancel message generation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={isDisabled || isLoading || !inputValue.trim()}
            className="p-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
            aria-label="Send chat message"
          >
            {isLoading && !onCancel ? <Spinner /> : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
            )}
          </button>
        </form>
        {tokenDetails && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs text-slate-400 space-y-1">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <strong>Last Turn:</strong>
              <span>Input: <span className="font-medium text-sky-400">{tokenDetails.lastTurnPromptTokens}</span></span>
              <span>Output: <span className="font-medium text-sky-400">{tokenDetails.lastTurnCandidateTokens}</span></span>
              <span>Cached In: <span className="font-medium text-purple-400">{tokenDetails.lastTurnCachedInputTokens}</span></span>
              <span>Total: <span className="font-medium text-sky-400">{tokenDetails.lastTurnTotalTokens}</span></span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <strong>Session Total:</strong>
              <span>Input: <span className="font-medium text-teal-400">{tokenDetails.sessionPromptTokens}</span></span>
              <span>Output: <span className="font-medium text-teal-400">{tokenDetails.sessionCandidateTokens}</span></span>
              <span>Cached In: <span className="font-medium text-fuchsia-400">{tokenDetails.sessionCachedInputTokens}</span></span>
              <span>Total: <span className="font-medium text-teal-400">{tokenDetails.sessionTotalTokens}</span></span>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
};