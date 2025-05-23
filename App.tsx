
import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as geminiService from './services/geminiService';
import * as anthropicService from './services/anthropicService';
import * as openAIService from './services/openAIService';
import { Spinner } from './components/Spinner';
import { Alert } from './components/Alert';
import { ChatBox, ChatMessage, ChatTokenDetails } from './components/ChatBox';
import { BuyMeACoffee } from './components/BuyMeACoffee';
import type { Chat as GeminiChat, Part as GeminiPart, GenerateContentResponse as GeminiGenerateContentResponse } from '@google/genai';

// Define LLMProvider type
type LLMProvider = 'google' | 'anthropic' | 'openai';

const LLM_PROVIDERS: { id: LLMProvider, name: string }[] = [
  { id: 'google', name: 'Google Gemini' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'openai', name: 'OpenAI GPT' },
];

const AVAILABLE_MODELS_BY_PROVIDER: Record<LLMProvider, string[]> = {
  google: ['gemini-2.5-flash-preview-04-17'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  openai: ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'],
};

// Updated ChatTokenDetails to include cached tokens
interface AppChatTokenDetails extends ChatTokenDetails {
  lastTurnCachedInputTokens: number;
  sessionCachedInputTokens: number;
}

const App: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('google');
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS_BY_PROVIDER.google[0]);
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


  // Text Chat State - Specific to Gemini for now
  const [textChatSession, setTextChatSession] = useState<GeminiChat | null>(null);
  const [textChatMessages, setTextChatMessages] = useState<ChatMessage[]>([]);
  const [isTextChatLoading, setIsTextChatLoading] = useState<boolean>(false);
  const [textChatError, setTextChatError] = useState<string | null>(null);
  const [textChatTokenDetails, setTextChatTokenDetails] = useState<AppChatTokenDetails | null>(null);
  const textChatAbortControllerRef = useRef<AbortController | null>(null);

  // PDF Chat State - Specific to Gemini for now
  const [pdfChatSession, setPdfChatSession] = useState<GeminiChat | null>(null);
  const [pdfChatMessages, setPdfChatMessages] = useState<ChatMessage[]>([]);
  const [isPdfChatLoading, setIsPdfChatLoading] = useState<boolean>(false);
  const [pdfChatError, setPdfChatError] = useState<string | null>(null);
  const [pdfChatTokenDetails, setPdfChatTokenDetails] = useState<AppChatTokenDetails | null>(null);
  const pdfChatAbortControllerRef = useRef<AbortController | null>(null);

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
    resetChatStates();
  }, []);

  useEffect(() => {
    resetCountsAndError();
    setSelectedModel(AVAILABLE_MODELS_BY_PROVIDER[selectedProvider][0]);
    if (apiKey.trim()) {
        setApiKeyError(null);
    }
  }, [selectedProvider, resetCountsAndError, apiKey]);
  
  useEffect(() => {
    resetCountsAndError();
     if (apiKey.trim()) {
        setApiKeyError(null);
    }
  }, [selectedModel, apiKey, resetCountsAndError]);

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = event.target.value as LLMProvider;
    setSelectedProvider(newProvider);
  };

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
      setApiKeyError(`API Key for ${LLM_PROVIDERS.find(p => p.id === selectedProvider)?.name || 'selected provider'} is required. Please enter it above to proceed.`);
      return false;
    }
    setApiKeyError(null);
    return true;
  };
  
  const handleApiServiceError = (e: any, operationContext: string) => {
      console.error(`Error during ${operationContext} with ${selectedProvider}:`, e);
      // Prioritize APIKeyOrPermissionError (custom name) or messages containing key phrases
      if (e.name === "ApiKeyOrPermissionError" || 
          (e.message && (
              e.message.toLowerCase().includes("api key") ||
              e.message.toLowerCase().includes("permission") ||
              e.message.toLowerCase().includes("quota") ||
              e.message.toLowerCase().includes("authentication_error") || // Anthropic
              e.message.toLowerCase().includes("billing_not_active") // Gemini
          ))
      ) {
         setApiKeyError(e.message);
      } else {
         setError(`Failed to ${operationContext}: ${e.message || 'Unknown error'}`);
      }
  };

  const analyzeTextTokens = useCallback(async () => {
    setIsLoadingTextCount(true);
    setError(null);
    setTextTokenCount(null);

    if (!commonApiCallChecks()) {
      setIsLoadingTextCount(false);
      return;
    }
    if (!storyText.trim()) {
      setError("Please enter some story text to analyze.");
      setIsLoadingTextCount(false);
      return;
    }

    try {
      let count: number;
      switch (selectedProvider) {
        case 'google':
          count = await geminiService.countTokensForText(apiKey, selectedModel, storyText);
          break;
        case 'anthropic':
          count = await anthropicService.countTokensForText(apiKey, selectedModel, storyText);
          break;
        case 'openai':
          count = await openAIService.countTokensForText(apiKey, selectedModel, storyText);
          break;
        default:
          throw new Error(`Unsupported provider: ${selectedProvider}`);
      }
      setTextTokenCount(count);
    } catch (e: any) {
      handleApiServiceError(e, "analyze text tokens");
    } finally {
      setIsLoadingTextCount(false);
    }
  }, [selectedProvider, apiKey, selectedModel, storyText]);

  const analyzePdfTokens = useCallback(async () => {
    setIsLoadingPdfCount(true);
    setError(null);
    setPdfTokenCount(null);

    if (!commonApiCallChecks()) {
      setIsLoadingPdfCount(false);
      return;
    }
    if (!pdfFile) {
      setError("Please upload a PDF file to analyze.");
      setIsLoadingPdfCount(false);
      return;
    }

    try {
      const base64ToUse = pdfBase64Data || await fileToBase64(pdfFile);
      if (!pdfBase64Data) setPdfBase64Data(base64ToUse);

      let count: number;
      switch (selectedProvider) {
        case 'google':
          count = await geminiService.countTokensForPdf(apiKey, selectedModel, base64ToUse, pdfFile.name);
          break;
        case 'anthropic':
          count = await anthropicService.countTokensForPdf(apiKey, selectedModel, base64ToUse, pdfFile.name);
          break;
        case 'openai':
          count = await openAIService.countTokensForPdf(apiKey, selectedModel, base64ToUse, pdfFile.name);
          break;
        default:
          throw new Error(`Unsupported provider: ${selectedProvider}`);
      }
      setPdfTokenCount(count);
    } catch (e: any) {
      handleApiServiceError(e, "analyze PDF tokens");
    } finally {
      setIsLoadingPdfCount(false);
    }
  }, [selectedProvider, apiKey, selectedModel, pdfFile, pdfBase64Data]);

  const isApiKeyMissing = !apiKey.trim();
  const isChatDisabledForProvider = selectedProvider !== 'google';


  const handleSendMessage = async (
    message: string,
    contextType: 'text' | 'pdf'
  ) => {
    if (!commonApiCallChecks()) { 
      const specificErrorSetter = contextType === 'text' ? setTextChatError : setPdfChatError;
      specificErrorSetter("API Key is required to start chat. Please enter it above and ensure it's valid.");
      return;
    }
    
    if (selectedProvider !== 'google') {
        const specificErrorSetter = contextType === 'text' ? setTextChatError : setPdfChatError;
        const providerName = LLM_PROVIDERS.find(p => p.id === selectedProvider)?.name || selectedProvider;
        // Attempt to call the service to see if it's a NotImplementedError or another issue
        try {
            if (contextType === 'text') {
                 await (selectedProvider === 'anthropic' ? anthropicService.createChatSession(apiKey, selectedModel) : openAIService.createChatSession(apiKey, selectedModel));
            } else {
                 await (selectedProvider === 'anthropic' ? anthropicService.createChatSession(apiKey, selectedModel) : openAIService.createChatSession(apiKey, selectedModel));
            }
        } catch (e: any) {
            if (e.name === "NotImplementedError") {
                 specificErrorSetter(`Chat is currently only supported for Google Gemini. Support for ${providerName} is coming soon.`);
            } else {
                 handleApiServiceError(e, `initialize chat for ${providerName}`);
                 specificErrorSetter(apiKeyError || error || `Could not initialize chat for ${providerName}: ${e.message}`);
            }
        }
        return;
    }

    // Gemini-specific chat logic
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
    let turnCachedInputTokens = 0; 

    try {
      if (!currentSession) {
        const systemInstruction = contextType === 'text'
          ? "You are a helpful AI assistant. The user has provided some text and will ask questions or discuss it."
          : "You are a helpful AI assistant. The user has provided a PDF document and will ask questions or discuss it.";
        currentSession = await geminiService.createChatSession(apiKey, selectedModel, systemInstruction);
        setSession(currentSession);
        setTokenDetails({...initialChatTokenDetails});
      }

      let messageToSend: string | { parts: GeminiPart[] };
      const userMessagesSoFar = (contextType === 'text' ? textChatMessages : pdfChatMessages).filter(m => m.role === 'user');
      const isFirstMeaningfulMessageInSession = userMessagesSoFar.length <=1 && (!getSession() || getSession() === currentSession);


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
      // Ensure currentSession is not null before calling sendMessageInChat
      if (!currentSession) {
          throw new Error("Chat session is not initialized.");
      }
      const stream = await geminiService.sendMessageInChat(currentSession, messageToSend, signal);
      modelMessageId = Date.now().toString() + "-model";
      setUserMessages(prev => [...prev, { id: modelMessageId!, role: 'model', content: '', isStreaming: true }]);

      for await (const chunk of stream) {
        if (signal.aborted) {
            setUserMessages(prev => prev.map(m => m.id === modelMessageId ? {...m, isStreaming: false, content: (m.content || "") + " [cancelled]"} : m));
            break;
        }
        const chunkText = (chunk as GeminiGenerateContentResponse).text; 
        setUserMessages(prev =>
          prev.map(msg =>
            msg.id === modelMessageId
              ? { ...msg, content: (msg.content || "") + chunkText }
              : msg
          )
        );
        if ((chunk as GeminiGenerateContentResponse).usageMetadata) {
            const usageMetadata = (chunk as GeminiGenerateContentResponse).usageMetadata;
            if (usageMetadata!.promptTokenCount && turnPromptTokens === 0) { // Only take first reported prompt tokens
                turnPromptTokens = usageMetadata!.promptTokenCount!;
            }
             if (usageMetadata!.cachedContentTokenCount && turnCachedInputTokens === 0) { // Only take first
                turnCachedInputTokens = usageMetadata!.cachedContentTokenCount!;
            }
            if (usageMetadata!.candidatesTokenCount) { // Sum up candidate tokens across chunks
                turnCandidateTokens += usageMetadata!.candidatesTokenCount!;
            }
        }
      }
      setUserMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg));

      const turnTotalTokens = turnPromptTokens + turnCandidateTokens;
      setTokenDetails(prevDetails => ({
        lastTurnPromptTokens: turnPromptTokens,
        lastTurnCandidateTokens: turnCandidateTokens,
        lastTurnTotalTokens: turnTotalTokens,
        lastTurnCachedInputTokens: turnCachedInputTokens, 
        sessionPromptTokens: (prevDetails?.sessionPromptTokens || 0) + turnPromptTokens,
        sessionCandidateTokens: (prevDetails?.sessionCandidateTokens || 0) + turnCandidateTokens,
        sessionTotalTokens: (prevDetails?.sessionTotalTokens || 0) + turnTotalTokens,
        sessionCachedInputTokens: (prevDetails?.sessionCachedInputTokens || 0) + turnCachedInputTokens, 
      }));

    } catch (e: any) {
        const errorMessage = e.message || 'Unknown error';
        if (e.name === 'AbortError') {
            setUserMessages(prev => prev.map(m => m.id === (modelMessageId || userMessageId) && m.isStreaming ? {...m, isStreaming: false, content: (m.content || "") + " [cancelled]"} : m));
        } else {
            console.error(`Error sending ${contextType} chat message:`, e);
            // Use handleApiServiceError for consistency if it's an API level error
            if (e.name === "ApiKeyOrPermissionError" || (errorMessage.toLowerCase().includes("api key") || errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("quota"))) {
                handleApiServiceError(e, `send ${contextType} chat message`);
                 setUserMessages(prev => prev.filter(m => m.id !== userMessageId && m.id !== modelMessageId)); 
            } else {
                setErrorState(`Failed to get chat response: ${errorMessage}`);
            }
             if (!(e.name === "ApiKeyOrPermissionError" || errorMessage.toLowerCase().includes("api key") || errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("quota"))) {
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
          LLM Token Analyzer
        </h1>
        <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
          Compare token usage and chat about your content using various LLMs with plain text or PDF.
        </p>
      </header>

      {apiKeyError && <Alert message={apiKeyError} type="error" onClose={() => setApiKeyError(null)} />}
      {error && !apiKeyError && <Alert message={error} type="error" onClose={() => setError(null)} />}


      <div className="max-w-2xl mx-auto mb-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-1">
            <label htmlFor="provider-select" className="block text-sm font-medium text-cyan-400 mb-2">
              LLM Provider
            </label>
            <select
              id="provider-select"
              value={selectedProvider}
              onChange={handleProviderChange}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-200"
            >
              {LLM_PROVIDERS.map(provider => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="api-key-input" className="block text-sm font-medium text-cyan-400 mb-2">
              API Key <span className="text-xs text-slate-500">({LLM_PROVIDERS.find(p=>p.id === selectedProvider)?.name})</span>
            </label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder={`Enter your ${LLM_PROVIDERS.find(p=>p.id === selectedProvider)?.name} API Key`}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-200 placeholder-slate-500"
              aria-required="true"
              aria-describedby="api-key-description"
            />
          </div>
        </div>
        <p id="api-key-description" className="mt-[-1rem] text-xs text-slate-500">
            Your API Key is used to communicate with the selected LLM API and is not stored.
            {isApiKeyMissing && <span className="block text-yellow-400 mt-1">API Key is required for token analysis and chat.</span>}
        </p>

        <div>
            <label htmlFor="model-select" className="block text-sm font-medium text-cyan-400 mb-2">
                Select Model <span className="text-xs text-slate-500">({LLM_PROVIDERS.find(p=>p.id === selectedProvider)?.name})</span>
            </label>
            <select
                id="model-select"
                value={selectedModel}
                onChange={handleModelChange}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-200"
            >
                {AVAILABLE_MODELS_BY_PROVIDER[selectedProvider].map(model => (
                    <option key={model} value={model}>{model}</option>
                ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
                The selected model will be used for token analysis {selectedProvider === 'google' ? 'and chat' : `(chat for ${LLM_PROVIDERS.find(p=>p.id === selectedProvider)?.name} is coming soon)`}.
                 {isApiKeyMissing && <span className="block text-yellow-400 mt-1">Enter API Key for token analysis and chat functionality.</span>}
            </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto`}>
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
              placeholder="Paste your story here..."
              rows={8}
              className="w-full p-4 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-gray-200 placeholder-slate-500 resize-y"
            />
            <button
              onClick={analyzeTextTokens}
              disabled={isLoadingTextCount || !storyText.trim()}
              className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Analyze plain text tokens"
            >
              {isLoadingTextCount ? <Spinner /> : 'Analyze Text Tokens'}
            </button>
            {textTokenCount !== null && (
              <div className="mt-4 p-4 bg-slate-700/50 border border-slate-600 rounded-md text-center">
                <p className="text-lg">Token Count: <span className="font-bold text-2xl text-cyan-400">{textTokenCount}</span>
                 {selectedProvider !== 'google' && <span className="text-xs text-slate-400 block">(estimated for {LLM_PROVIDERS.find(p=>p.id===selectedProvider)?.name})</span>}
                </p>
              </div>
            )}
          </div>
          <ChatBox
            title="Chat about Text"
            messages={textChatMessages}
            onSendMessage={(msg) => handleSendMessage(msg, 'text')}
            isLoading={isTextChatLoading}
            isDisabled={isApiKeyMissing || !storyText.trim() || isChatDisabledForProvider}
            placeholderText={
              isApiKeyMissing ? "Enter API Key to chat." 
              : !storyText.trim() ? "Enter text above to chat" 
              : isChatDisabledForProvider ? `Chat coming soon for ${LLM_PROVIDERS.find(p=>p.id===selectedProvider)?.name}` 
              : "Ask about the text..."
            }
            error={textChatError}
            onCloseError={() => setTextChatError(null)}
            onCancel={isTextChatLoading ? () => textChatAbortControllerRef.current?.abort() : undefined}
            tokenDetails={isChatDisabledForProvider ? null : textChatTokenDetails}
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
              <label htmlFor="pdf-upload" className={`w-full flex flex-col items-center px-4 py-6 bg-slate-700 border-2 border-dashed border-slate-600 rounded-md cursor-pointer hover:border-indigo-500 hover:bg-slate-700/70 transition-colors`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25V21a3 3 0 0 1-3 3H7.5a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3h4.5m0-3V3m0 0H9.75m3.75 0A3.75 3.75 0 0 1 17.25 6.75v3.75m0 0A3.75 3.75 0 0 1 13.5 14.25H9.75m3.75 0h3.75M3.75 12h16.5" />
                </svg>
                <span className="mt-2 text-base leading-normal text-slate-400">{pdfFileName || "Select a PDF file"}</span>
                <input id="pdf-upload" type="file" accept=".pdf" onChange={handlePdfChange} className="hidden" />
              </label>
            </div>
            <button
              onClick={analyzePdfTokens}
              disabled={isLoadingPdfCount || !pdfFile}
              className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Analyze PDF document tokens"
            >
              {isLoadingPdfCount ? <Spinner /> : 'Analyze PDF Tokens'}
            </button>
            {pdfTokenCount !== null && (
              <div className="mt-4 p-4 bg-slate-700/50 border border-slate-600 rounded-md text-center">
                <p className="text-lg">Token Count: <span className="font-bold text-2xl text-indigo-400">{pdfTokenCount}</span>
                 {selectedProvider !== 'google' && <span className="text-xs text-slate-400 block">(estimated for {LLM_PROVIDERS.find(p=>p.id===selectedProvider)?.name})</span>}
                </p>
              </div>
            )}
          </div>
           <ChatBox
            title="Chat about PDF"
            messages={pdfChatMessages}
            onSendMessage={(msg) => handleSendMessage(msg, 'pdf')}
            isLoading={isPdfChatLoading}
            isDisabled={isApiKeyMissing || !pdfFile || !pdfBase64Data || isChatDisabledForProvider}
            placeholderText={
                isApiKeyMissing ? "Enter API Key to chat." 
                : !pdfFile ? "Upload PDF to chat" 
                : isChatDisabledForProvider ? `Chat coming soon for ${LLM_PROVIDERS.find(p=>p.id===selectedProvider)?.name}` 
                : "Ask about the PDF..."
            }
            error={pdfChatError}
            onCloseError={() => setPdfChatError(null)}
            onCancel={isPdfChatLoading ? () => pdfChatAbortControllerRef.current?.abort() : undefined}
            tokenDetails={isChatDisabledForProvider ? null : pdfChatTokenDetails}
          />
        </div>
      </div>

      <footer className="text-center mt-12 py-6 border-t border-slate-700">
        <p className="text-sm text-slate-500">
          Powered by various LLM APIs. This tool provides an estimate of token usage and allows contextual chat for supported providers.
          {isApiKeyMissing && <span className="block text-yellow-400 mt-1">API Key is required for token analysis and chat functionality. Please enter your API Key above.</span>}
        </p>
        <div className="mt-4"> 
           <BuyMeACoffee />
        </div>
      </footer>
    </div>
  );
};

export default App;
