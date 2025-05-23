
import { GoogleGenAI, Content, Part, Chat, GenerateContentResponse } from "@google/genai";


const validateApiKey = (apiKeyToCheck?: string): string => {
  if (!apiKeyToCheck || apiKeyToCheck.trim() === "") {
    throw new Error("Gemini API Key is required and was not provided to the service function.");
  }
  return apiKeyToCheck;
}

const handleApiError = (error: any, context: string): Error => {
    console.error(`Error ${context}:`, error);
    if (error instanceof Error) {
        // Check for specific Gemini API error messages
        if (error.message.includes("API_KEY_INVALID") || 
            error.message.includes("API key not valid") || 
            error.message.includes("permission to access project") || // Broader permission issue
            error.message.includes("PERMISSION_DENIED")) { // General permission denied
             return new Error(`Gemini API error: Invalid API Key or insufficient permissions. Please check your key and its configuration. Original: ${error.message}`);
        }
        if (error.message.includes("Quota exceeded")) {
            return new Error(`Gemini API error: Quota exceeded for your API key. Please check your Google AI Studio dashboard. Original: ${error.message}`);
        }
        if (error.name === 'AbortError') { // Check for AbortError
            return new Error(`Request aborted during ${context}.`);
        }
        return new Error(`Gemini API error during ${context}: ${error.message}`);
    }
    return new Error(`An unknown error occurred during ${context}.`);
}

export const countTokensForText = async (apiKey: string, modelName: string, text: string): Promise<number> => {
  const validatedApiKey = validateApiKey(apiKey);
  if (!modelName || modelName.trim() === "") {
    throw new Error("Model name is required for Gemini API calls.");
  }
  const ai = new GoogleGenAI({ apiKey: validatedApiKey }); 
  
  try {
    const response = await ai.models.countTokens({
        model: modelName,
        contents: [{ parts: [{text: text}]}] // Ensure contents is an array of Content objects
    });
    return response.totalTokens;
  } catch (error) {
    throw handleApiError(error, "counting text tokens");
  }
};

export const countTokensForPdf = async (apiKey: string, modelName: string, pdfBase64Data: string): Promise<number> => {
  const validatedApiKey = validateApiKey(apiKey);
  if (!modelName || modelName.trim() === "") {
    throw new Error("Model name is required for Gemini API calls.");
  }
  if (!pdfBase64Data || pdfBase64Data.trim() === "") {
    throw new Error("PDF data is required for counting tokens.");
  }
  const ai = new GoogleGenAI({ apiKey: validatedApiKey });

  try {
    const pdfPart: Part = {
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64Data,
      },
    };
    // Ensure contents is an array of Content objects
    const request = { model: modelName, contents: [{ parts: [pdfPart] }] };
    const response = await ai.models.countTokens(request);
    return response.totalTokens;
  } catch (error) {
    throw handleApiError(error, "counting PDF tokens");
  }
};

export const createChatSession = async (
  apiKey: string,
  modelName: string,
  systemInstruction?: string
): Promise<Chat> => {
  const validatedApiKey = validateApiKey(apiKey);
  if (!modelName || modelName.trim() === "") {
    throw new Error("Model name is required for Gemini API calls.");
  }
  const ai = new GoogleGenAI({ apiKey: validatedApiKey });
  try {
    return ai.chats.create({
        model: modelName,
        config: systemInstruction ? { systemInstruction } : undefined,
    });
  } catch (error) {
    throw handleApiError(error, "creating chat session");
  }
};

export const sendMessageInChat = async (
  chat: Chat,
  messageContent: string | { parts: Part[] },
  _signal?: AbortSignal // For client-side cancellation loop breaking in App.tsx
): Promise<AsyncIterable<GenerateContentResponse>> => {
  if (!chat) {
    throw new Error("Chat session is not initialized.");
  }
  try {
    let messagePayload: string | Part[];
    if (typeof messageContent === 'string') {
      messagePayload = messageContent;
    } else { 
      messagePayload = messageContent.parts;
    }

    // chat.sendMessageStream expects an object with a 'message' property
    // which can be a string or Part[]
    const responseStream = await chat.sendMessageStream({ message: messagePayload });
    return responseStream;

  } catch (error) {
     if (error instanceof Error && error.name === 'AbortError') {
        console.warn("sendMessageInChat: SDK call resulted in AbortError.");
        throw error; 
    }
    throw handleApiError(error, "sending chat message");
  }
};