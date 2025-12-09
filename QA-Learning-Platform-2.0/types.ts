export enum Role {
  User = 'user',
  Assistant = 'assistant',
  System = 'system'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  isStreaming?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
}