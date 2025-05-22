
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { countTokensForText, countTokensForPdf, createChatSession, sendMessageInChat } from './services/geminiService';
import { Spinner } from './components/Spinner';
import { Alert } from './components/Alert';
import { ChatBox, ChatMessage, ChatTokenDetails } from './components/ChatBox';
import { BuyMeACoffee } from './components/BuyMeACoffee'; // Import the new component
import type { Chat, Part, GenerateContentResponse } from '@google/genai';

const AVAILABLE_MODELS = ['gemini-2.5-flash-preview-04-17'];

// Updated ChatTokenDetails to include cached tokens
interface AppChatTokenDetails extends ChatTokenDetails {
  lastTurnCachedInputTokens: number;
  sessionCachedInputTokens: number;
}

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0]);
  const [storyText, setStoryText] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfBase64Data, setPdfBase64Data] = useState<string | null>(null);

  const [textTokenCount, setTextTokenCount] = useState<number | null>(null);
  const [pdfTokenCount, setPdfTokenCount] = useState<number | null>(null);

  const [isLoadingTextCount, setIsLoadingTextCount] = useState<boolean>(false);
  const [isLoadingPdfCount, setIsLoadingPdfCount] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);


  // Text Chat State
  const [textChatSession, setTextChatSession] = useState<Chat | null>(null);
  const [textChatMessages, setTextChatMessages] = useState<ChatMessage[]>([]);
  const [isTextChatLoading, setIsTextChatLoading] = useState<boolean>(false);
  const [textChatError, setTextChatError] = useState<string | null>(null);
  const [textChatTokenDetails, setTextChatTokenDetails] = useState<AppChatTokenDetails | null>(null); // Use updated interface
  const textChatAbortControllerRef = useRef<AbortController | null>(null);

  // PDF Chat State
  const [pdfChatSession, setPdfChatSession] = useState<Chat | null>(null);
  const [pdfChatMessages, setPdfChatMessages] = useState<ChatMessage[]>([]);
  const [isPdfChatLoading, setIsPdfChatLoading] = useState<boolean>(false);
  const [pdfChatError, setPdfChatError] = useState<string | null>(null);
  const [pdfChatTokenDetails, setPdfChatTokenDetails] = useState<AppChatTokenDetails | null>(null); // Use updated interface
  const pdfChatAbortControllerRef = useRef<AbortController | null>(null);

  // Remove BMC script loading logic
  // const bmcButtonContainerRef = useRef<HTMLDivElement>(null);
  // useEffect(() => { ... removed BMC script loading ... }, []);


  const initialChatTokenDetails: AppChatTokenDetails = {
    lastTurnPromptTokens: 0,
    lastTurnCandidateTokens: 0,
    lastTurnTotalTokens: 0,
    lastTurnCachedInputTokens: 0,
    sessionPromptTokens: 0,
    sessionCandidateTokens: 0,
    sessionTotalTokens: 0,
    sessionCachedInputTokens: 0,
  };

  const resetChatStates = () => {
    setTextChatSession(null);
    setTextChatMessages([]);
    setTextChatError(null);
    setTextChatTokenDetails(null);
    if (textChatAbortControllerRef.current) {
        textChatAbortControllerRef.current.abort();
        textChatAbortControllerRef.current = null;
    }
    setPdfChatSession(null);
    setPdfChatMessages([]);
    setPdfChatError(null);
    setPdfChatTokenDetails(null);
    if (pdfChatAbortControllerRef.current) {
        pdfChatAbortControllerRef.current.abort();
        pdfChatAbortControllerRef.current = null;
    }
  };

  const resetCountsAndError = useCallback(() => {
    setTextTokenCount(null);
    setPdfTokenCount(null);
    setError(null);
    setApiKeyError(null);
    resetChatStates();
  }, []);

  useEffect(() => {
    resetCountsAndError();
  }, [selectedModel, apiKey, resetCountsAndError]);


  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = event.target.value;
    setApiKey(newApiKey);
    if (newApiKey.trim()) {
      setApiKeyError(null);
    }
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(event.target.value);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStoryText(event.target.value);
    setTextTokenCount(null);
    setError(null);
    if (textChatSession) {
      setTextChatSession(null);
      setTextChatMessages([]);
      setTextChatError(null);
      setTextChatTokenDetails(null);
    }
  };

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "application/pdf") {
        setPdfFile(file);
        setPdfFileName(file.name);
        setPdfTokenCount(null);
        setError(null);
        try {
          const base64Data = await fileToBase64(file);
          setPdfBase64Data(base64Data);
        } catch (e) {
          setError("Failed to read PDF for chat context.");
          setPdfBase64Data(null);
        }
        if (pdfChatSession) {
          setPdfChatSession(null);
          setPdfChatMessages([]);
          setPdfChatError(null);
          setPdfChatTokenDetails(null);
        }
      } else {
        setError("Please upload a valid PDF file.");
        setPdfFile(null);
        setPdfFileName('');
        setPdfBase64Data(null);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error("Failed to read file as base64 string."));
        }
      };
      reader.onerror = (errorEvent) => reject(errorEvent);
    });
  };

  const commonApiCallChecks = () => {
    if (!apiKey.trim()) {
      setApiKeyError("Gemini API Key is required. Please enter it above.");
      return false;
    }
    setApiKeyError(null);
    return true;
  };

  const analyzeTextTokens = useCallback(async () => {
    if (!commonApiCallChecks()) return;
    if (!storyText.trim()) {
      setError("Please enter some story text.");
      return;
    }

    setIsLoadingTextCount(true);
    setError(null);
    setTextTokenCount(null);

    try {
      const count = await countTokensForText(apiKey, selectedModel, storyText);
      setTextTokenCount(count);
    } catch (e: any) {
      console.error("Error analyzing text tokens:", e);
      if (e.message.includes("API Key") || e.message.includes("API key") || e.message.includes("permission")) setApiKeyError(e.message);
      else setError(`Failed to analyze text tokens: ${e.message || 'Unknown error'}`);
    } finally {
      setIsLoadingTextCount(false);
    }
  }, [apiKey, selectedModel, storyText]);

  const analyzePdfTokens = useCallback(async () => {
    if (!commonApiCallChecks()) return;
    if (!pdfFile) {
      setError("Please upload a PDF file.");
      return;
    }

    setIsLoadingPdfCount(true);
    setError(null);
    setPdfTokenCount(null);

    try {
      const base64ToUse = pdfBase64Data || await fileToBase64(pdfFile);
      if (!pdfBase64Data) setPdfBase64Data(base64ToUse);

      const count = await countTokensForPdf(apiKey, selectedModel, base64ToUse);
      setPdfTokenCount(count);
    } catch (e: any) {
      console.error("Error analyzing PDF tokens:", e);
      if (e.message.includes("API Key") || e.message.includes("API key") || e.message.includes("permission")) setApiKeyError(e.message);
      else setError(`Failed to analyze PDF tokens: ${e.message || 'Unknown error'}`);
    } finally {
      setIsLoadingPdfCount(false);
    }
  }, [apiKey, selectedModel, pdfFile, pdfBase64Data]);

  const isApiKeyMissing = !apiKey.trim();

  const handleSendMessage = async (
    message: string,
    contextType: 'text' | 'pdf'
  ) => {
    if (!commonApiCallChecks()) {
      const specificErrorSetter = contextType === 'text' ? setTextChatError : setPdfChatError;
      specificErrorSetter("API Key is required to start chat. Please enter it above.");
      return;
    }

    const setUserMessages = contextType === 'text' ? setTextChatMessages : setPdfChatMessages;
    const setLoading = contextType === 'text' ? setIsTextChatLoading : setIsPdfChatLoading;
    const setErrorState = contextType === 'text' ? setTextChatError : setPdfChatError;
    const getSession = () => (contextType === 'text' ? textChatSession : pdfChatSession);
    const setSession = contextType === 'text' ? setTextChatSession : setPdfChatSession;
    const setTokenDetails = contextType === 'text' ? setTextChatTokenDetails : setPdfChatTokenDetails;
    const getContextData = () => {
      if (contextType === 'text') return storyText;
      if (contextType === 'pdf') return pdfBase64Data;
      return null;
    };
    const abortControllerRef = contextType === 'text' ? textChatAbortControllerRef : pdfChatAbortControllerRef;

    const userMessageId = Date.now().toString();
    setUserMessages(prev => [...prev, { id: userMessageId, role: 'user', content: message }]);
    setLoading(true);
    setErrorState(null);

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let currentSession = getSession();
    let modelMessageId: string | null = null;

    let turnPromptTokens = 0;
    let turnCandidateTokens = 0;
    let turnCachedInputTokens = 0; // Initialize cached tokens for the turn

    try {
      if (!currentSession) {
        const systemInstruction = contextType === 'text'
          ? "You are a helpful AI assistant. The user has provided some text and will ask questions or discuss it."
          : "You are a helpful AI assistant. The user has provided a PDF document and will ask questions or discuss it.";
        currentSession = await createChatSession(apiKey, selectedModel, systemInstruction);
        setSession(currentSession);
        setTokenDetails({...initialChatTokenDetails}); // Reset session token accumulators
      }

      let messageToSend: string | { parts: Part[] };
      const userMessagesSoFar = (contextType === 'text' ? textChatMessages : pdfChatMessages).filter(m => m.role === 'user');
      const isFirstMeaningfulMessageInSession = userMessagesSoFar.length <= 1 && (!getSession() || getSession() === currentSession);


      if (contextType === 'text') {
        const currentStoryText = getContextData();
        if (!currentStoryText || !currentStoryText.trim()) {
            setErrorState("Please enter some story text to chat about.");
            setLoading(false);
            setUserMessages(prev => prev.filter(m => m.id !== userMessageId));
            return;
        }
        messageToSend = isFirstMeaningfulMessageInSession
            ? `Contextual Text:\n"""\n${currentStoryText}\n"""\n\nUser Query: ${message}`
            : message;
      } else {
        const currentPdfData = getContextData();
        if (!currentPdfData) {
            setErrorState("PDF data is not available for chat. Please re-upload if necessary.");
            setLoading(false);
            setUserMessages(prev => prev.filter(m => m.id !== userMessageId));
            return;
        }
        if (isFirstMeaningfulMessageInSession) {
            messageToSend = {
                parts: [
                    { inlineData: { mimeType: 'application/pdf', data: currentPdfData } },
                    { text: `User Query about the PDF: ${message}` }
                ]
            };
        } else {
            messageToSend = message;
        }
      }

      const stream = await sendMessageInChat(currentSession!, messageToSend, signal);
      modelMessageId = Date.now().toString() + "-model";
      setUserMessages(prev => [...prev, { id: modelMessageId!, role: 'model', content: '', isStreaming: true }]);

      for await (const chunk of stream) {
        if (signal.aborted) {
            setUserMessages(prev => prev.map(m => m.id === modelMessageId ? {...m, isStreaming: false, content: (m.content || "") + " [cancelled]"} : m));
            break;
        }
        const chunkText = chunk.text;
        setUserMessages(prev =>
          prev.map(msg =>
            msg.id === modelMessageId
              ? { ...msg, content: (msg.content || "") + chunkText }
              : msg
          )
        );
        if (chunk.usageMetadata) {
            if (chunk.usageMetadata.promptTokenCount && turnPromptTokens === 0) {
                turnPromptTokens = chunk.usageMetadata.promptTokenCount;
            }
            if (chunk.usageMetadata.cachedContentTokenCount && turnCachedInputTokens === 0) { // Capture cached tokens
                turnCachedInputTokens = chunk.usageMetadata.cachedContentTokenCount;
            }
            if (chunk.usageMetadata.candidatesTokenCount) {
                turnCandidateTokens += chunk.usageMetadata.candidatesTokenCount;
            }
        }
      }
      setUserMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg));

      const turnTotalTokens = turnPromptTokens + turnCandidateTokens;
      setTokenDetails(prevDetails => ({
        lastTurnPromptTokens: turnPromptTokens,
        lastTurnCandidateTokens: turnCandidateTokens,
        lastTurnTotalTokens: turnTotalTokens,
        lastTurnCachedInputTokens: turnCachedInputTokens, // Store last turn cached tokens
        sessionPromptTokens: (prevDetails?.sessionPromptTokens || 0) + turnPromptTokens,
        sessionCandidateTokens: (prevDetails?.sessionCandidateTokens || 0) + turnCandidateTokens,
        sessionTotalTokens: (prevDetails?.sessionTotalTokens || 0) + turnTotalTokens,
        sessionCachedInputTokens: (prevDetails?.sessionCachedInputTokens || 0) + turnCachedInputTokens, // Accumulate session cached tokens
      }));


    } catch (e: any) {
        const errorMessage = e.message || 'Unknown error';
        if (e.name === 'AbortError') {
            setUserMessages(prev => prev.map(m => m.id === (modelMessageId || userMessageId) && m.isStreaming ? {...m, isStreaming: false, content: (m.content || "") + " [cancelled]"} : m));
        } else {
            console.error(`Error sending ${contextType} chat message:`, e);
            if (errorMessage.includes("API Key") || errorMessage.includes("API key") || errorMessage.includes("permission")) {
                setApiKeyError(errorMessage);
                 setUserMessages(prev => prev.filter(m => m.id !== userMessageId && m.id !== modelMessageId));

            } else {
                setErrorState(`Failed to get chat response: ${errorMessage}`);
            }
            if (!(errorMessage.includes("API Key") || errorMessage.includes("API key") || errorMessage.includes("permission"))) {
                setUserMessages(prev => prev.map(msg => msg.id === (modelMessageId || userMessageId) && msg.isStreaming ? { ...msg, isStreaming: false, error: true, content: (msg.content || "") + " [Error]" } : (msg.id === userMessageId && !modelMessageId ? {...msg, error:true} : msg)));
            }
        }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-8 text-gray-100">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
          Gemini Token Analyzer
        </h1>
        <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
          Compare token usage and chat about your content using plain text or PDF.
        </p>
      </header>

      {apiKeyError && <Alert message={apiKeyError} type="error" onClose={() => setApiKeyError(null)} />}
      {error && !apiKeyError && <Alert message={error} type="error" onClose={() => setError(null)} />}

      <div className="max-w-2xl mx-auto mb-8 space-y-6">
         <div>
          <label htmlFor="api-key-input" className="block text-sm font-medium text-cyan-400 mb-2">
            Gemini API Key
          </label>
          <input
            id="api-key-input"
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="Enter your Gemini API Key"
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-200 placeholder-slate-500"
            aria-required="true"
            aria-describedby="api-key-description"
          />
           <p id="api-key-description" className="mt-2 text-xs text-slate-500">
            Your API Key is used to communicate with the Gemini API and is not stored.
            {isApiKeyMissing && <span className="block text-yellow-400 mt-1">API Key is required to enable functionality.</span>}
          </p>
        </div>
        <div>
            <label htmlFor="model-select" className="block text-sm font-medium text-cyan-400 mb-2">
                Select Gemini Model
            </label>
            <select
                id="model-select"
                value={selectedModel}
                onChange={handleModelChange}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isApiKeyMissing}
            >
                {AVAILABLE_MODELS.map(model => (
                    <option key={model} value={model}>{model}</option>
                ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
                The selected model will be used for token analysis and chat.
                 {isApiKeyMissing && <span className="block text-yellow-400 mt-1">Enter API Key to enable model selection.</span>}
            </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto ${isApiKeyMissing ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className={`bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8 border border-slate-700 flex flex-col gap-6 transition-opacity`}>
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-cyan-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Analyze & Chat: Plain Text
            </h2>
            <textarea
              value={storyText}
              onChange={handleTextChange}
              placeholder={isApiKeyMissing ? "Enter API Key to enable functionality." : "Paste your story here..."}
              rows={8}
              className="w-full p-4 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-200 placeholder-slate-500 resize-y"
              disabled={isApiKeyMissing}
            />
            <button
              onClick={analyzeTextTokens}
              disabled={isApiKeyMissing || isLoadingTextCount || !storyText.trim()}
              className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Analyze plain text tokens"
            >
              {isLoadingTextCount ? <Spinner /> : 'Analyze Text Tokens'}
            </button>
            {textTokenCount !== null && (
              <div className="mt-4 p-4 bg-slate-700/50 border border-slate-600 rounded-md text-center">
                <p className="text-lg">Token Count: <span className="font-bold text-2xl text-cyan-400">{textTokenCount}</span></p>
              </div>
            )}
          </div>
          <ChatBox
            title="Chat about Text"
            messages={textChatMessages}
            onSendMessage={(msg) => handleSendMessage(msg, 'text')}
            isLoading={isTextChatLoading}
            isDisabled={isApiKeyMissing || !storyText.trim()}
            placeholderText={isApiKeyMissing ? "Enter API Key to chat." : !storyText.trim() ? "Enter text above to chat" : "Ask about the text..."}
            error={textChatError}
            onCloseError={() => setTextChatError(null)}
            onCancel={isTextChatLoading ? () => textChatAbortControllerRef.current?.abort() : undefined}
            tokenDetails={textChatTokenDetails}
          />
        </div>

        <div className={`bg-slate-800 shadow-2xl rounded-xl p-6 sm:p-8 border border-slate-700 flex flex-col gap-6 transition-opacity`}>
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-indigo-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H9M3 12h6" />
              </svg>
              Analyze & Chat: PDF Document
            </h2>
            <div className="mb-4">
              <label htmlFor="pdf-upload" className={`w-full flex flex-col items-center px-4 py-6 bg-slate-700 border-2 border-dashed border-slate-600 rounded-md hover:border-indigo-500 hover:bg-slate-700/70 transition-colors ${isApiKeyMissing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25V21a3 3 0 0 1-3 3H7.5a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3h4.5m0-3V3m0 0H9.75m3.75 0A3.75 3.75 0 0 1 17.25 6.75v3.75m0 0A3.75 3.75 0 0 1 13.5 14.25H9.75m3.75 0h3.75M3.75 12h16.5" />
                </svg>
                <span className="mt-2 text-base leading-normal text-slate-400">{isApiKeyMissing ? "Enter API Key to enable." : pdfFileName || "Select a PDF file"}</span>
                <input id="pdf-upload" type="file" accept=".pdf" onChange={handlePdfChange} className="hidden" disabled={isApiKeyMissing} />
              </label>
            </div>
            <button
              onClick={analyzePdfTokens}
              disabled={isApiKeyMissing || isLoadingPdfCount || !pdfFile}
              className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Analyze PDF document tokens"
            >
              {isLoadingPdfCount ? <Spinner /> : 'Analyze PDF Tokens'}
            </button>
            {pdfTokenCount !== null && (
              <div className="mt-4 p-4 bg-slate-700/50 border border-slate-600 rounded-md text-center">
                <p className="text-lg">Token Count: <span className="font-bold text-2xl text-indigo-400">{pdfTokenCount}</span></p>
              </div>
            )}
          </div>
           <ChatBox
            title="Chat about PDF"
            messages={pdfChatMessages}
            onSendMessage={(msg) => handleSendMessage(msg, 'pdf')}
            isLoading={isPdfChatLoading}
            isDisabled={isApiKeyMissing || !pdfFile || !pdfBase64Data}
            placeholderText={isApiKeyMissing ? "Enter API Key to chat." : !pdfFile ? "Upload PDF to chat" : "Ask about the PDF..."}
            error={pdfChatError}
            onCloseError={() => setPdfChatError(null)}
            onCancel={isPdfChatLoading ? () => pdfChatAbortControllerRef.current?.abort() : undefined}
            tokenDetails={pdfChatTokenDetails}
          />
        </div>
      </div>

      <footer className="text-center mt-12 py-6 border-t border-slate-700">
        <p className="text-sm text-slate-500">
          Powered by Gemini API. This tool provides an estimate of token usage and allows contextual chat.
          {isApiKeyMissing && <span className="block text-yellow-400 mt-1">API Key is required. Please enter your Gemini API Key above.</span>}
        </p>
        <div className="mt-4"> {/* Container for BMC button */}
           <BuyMeACoffee />
        </div>
      </footer>
    </div>
  );
};

export default App;
