import { Role, Message } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export interface SendMessageRequest {
  message: string;
  session_id?: string;
}

export interface SendMessageResponse {
  session_id: string;
  message: {
    role: string;
    content: string;
    timestamp: string;
  };
  assistant_response: {
    role: string;
    content: string;
    timestamp: string;
  };
}

export interface CreateSessionResponse {
  session_id: string;
  thread_id: string;
}

export interface DeleteSessionResponse {
  session_id: string;
  deleted: boolean;
}

// Current session ID - in a real app, this would be managed by state/context
let currentSessionId: string | null = null;

export const createNewSession = async (): Promise<CreateSessionResponse> => {
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  const data = await response.json();
  currentSessionId = data.session_id;
  return data;
};

export const deleteSession = async (sessionId: string): Promise<DeleteSessionResponse> => {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }

  const data = await response.json();
  if (currentSessionId === sessionId) {
    currentSessionId = null;
  }
  return data;
};

export const sendMessage = async (message: string): Promise<SendMessageResponse> => {
  // Create session if we don't have one
  if (!currentSessionId) {
    await createNewSession();
  }

  const request: SendMessageRequest = {
    message,
    session_id: currentSessionId || undefined,
  };

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  const data = await response.json();

  // Update current session ID
  currentSessionId = data.session_id;

  return data;
};

// Global flag to stop streaming
let isStreamingStopped = false;

export const stopStreaming = (): void => {
  isStreamingStopped = true;
};

export const generateMockResponse = async (
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  try {
    isStreamingStopped = false; // Reset flag at start
    const response = await sendMessage(prompt);

    // Simulate streaming by sending response character by character
    const assistantContent = response.assistant_response.content;
    const chars = assistantContent.split('');

    for (let i = 0; i < chars.length; i++) {
      if (isStreamingStopped) {
        break; // Stop streaming if requested
      }
      await new Promise(resolve => setTimeout(resolve, 30)); // 30ms delay between chars
      onChunk(chars[i]);
    }
  } catch (error) {
    console.error('Error sending message:', error);
    // Fallback to a simple error message
    const errorMessage = "Sorry, I encountered an error. Please try again.";
    const chars = errorMessage.split('');
    isStreamingStopped = false; // Reset flag for error case

    for (let i = 0; i < chars.length; i++) {
      if (isStreamingStopped) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 30));
      onChunk(chars[i]);
    }
  }
};

export const getCurrentSessionId = (): string | null => {
  return currentSessionId;
};

export const clearCurrentSession = (): void => {
  currentSessionId = null;
};