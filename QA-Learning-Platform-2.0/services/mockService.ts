import { Role, Message } from '../types';

const API_BASE_URL = '/api/v1';

export interface SendMessageRequest {
  message: string;
  session_id?: string;
  file_ids?: string[];
  image_file_ids?: string[];
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

export interface UploadFileResponse {
  file_id: string;
  filename: string;
  type: 'image' | 'file';
}

// Current session ID - in a real app, this would be managed by state/context
let currentSessionId: string | null = null;

export const uploadFile = async (file: File): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }

  return await response.json();
};


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

export const sendMessage = async (message: string, fileIds?: string[], imageFileIds?: string[]): Promise<SendMessageResponse> => {
  // Create session if we don't have one
  if (!currentSessionId) {
    await createNewSession();
  }

  const request: SendMessageRequest = {
    message,
    session_id: currentSessionId || undefined,
    file_ids: fileIds,
    image_file_ids: imageFileIds,
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
  onChunk: (chunk: string) => void,
  fileIds?: string[],
  imageFileIds?: string[]
): Promise<void> => {
  try {
    isStreamingStopped = false; // Reset flag at start
    const response = await sendMessage(prompt, fileIds, imageFileIds);

    // Simulate streaming by sending response character by character
    const assistantContent = response.assistant_response.content;
    // Tune streaming: larger chunks with safer boundaries and moderate delay
    const STREAM_CHUNK_SIZE = 18; // number of characters per chunk
    const STREAM_DELAY_MS = 22; // delay between chunks (ms)
    const SAFE_BOUNDARIES = [' ', '\n', '\t', '.', ',', ';', ':', ')', ']', '}', '—', '–'];

    let index = 0;
    while (index < assistantContent.length) {
      if (isStreamingStopped) {
        break; // Stop streaming if requested
      }
      const tentativeNext = Math.min(index + STREAM_CHUNK_SIZE, assistantContent.length);
      let nextIndex = tentativeNext;
      // Avoid splitting mid-token (helps with LaTeX/markdown rendering)
      if (tentativeNext < assistantContent.length) {
        const window = assistantContent.slice(index, tentativeNext);
        // Try to cut at the last safe boundary within the window
        let cut = -1;
        for (let i = window.length - 1; i >= 0; i--) {
          if (SAFE_BOUNDARIES.includes(window[i])) {
            cut = i;
            break;
          }
        }
        if (cut > 3) { // ensure we don't produce too tiny chunks
          nextIndex = index + cut + 1;
        }
      }

      const chunk = assistantContent.slice(index, nextIndex);
      onChunk(chunk);
      index = nextIndex;
      await new Promise(resolve => setTimeout(resolve, STREAM_DELAY_MS));
    }
  } catch (error) {

    console.error('Error sending message:', error);
    // Fallback to a simple error message
    const errorMessage = "Sorry, I encountered an error. Please try again.";
    const STREAM_CHUNK_SIZE = 18;
    const STREAM_DELAY_MS = 22;
    isStreamingStopped = false; // Reset flag for error case
    let index = 0;
    while (index < errorMessage.length) {
      if (isStreamingStopped) {
        break;
      }
      const nextIndex = Math.min(index + STREAM_CHUNK_SIZE, errorMessage.length);
      const chunk = errorMessage.slice(index, nextIndex);
      onChunk(chunk);
      index = nextIndex;
      await new Promise(resolve => setTimeout(resolve, STREAM_DELAY_MS));
    }
  }
};

export const getCurrentSessionId = (): string | null => {
  return currentSessionId;
};

export const clearCurrentSession = (): void => {
  currentSessionId = null;
};