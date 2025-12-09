
import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, User } from '../types';
import { Button } from './Button';
import { MessageBubble } from './MessageBubble';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { generateMockResponse, createNewSession, deleteSession, getCurrentSessionId, clearCurrentSession, stopStreaming } from '../services/mockService';
import { EXAMPLE_PROMPTS } from '../constants';

interface ChatInterfaceProps {
  user: User | null;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, onLogout, isDarkMode, onToggleTheme }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('/health');
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const startNewSession = async () => {
    try {
      setIsTyping(true);
      await createNewSession();
      setMessages([]);
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to create new session:', error);
      setIsTyping(false);
    }
  };

  const clearCurrentSession = async () => {
    const sessionId = getCurrentSessionId();
    if (sessionId) {
      try {
        await deleteSession(sessionId);
        clearCurrentSession();
        setMessages([]);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const handleStopStreaming = () => {
    stopStreaming();
    setIsStreaming(false);
    setIsTyping(false);

    // Mark the last assistant message as completed (not streaming)
    setMessages(prev => prev.map(msg => {
      if (msg.isStreaming) {
        return { ...msg, isStreaming: false };
      }
      return msg;
    }));
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      // Load messages from selected session
      const response = await fetch(`${process.env.REACT_APP_API_URL}/sessions/${sessionId}/messages`);
      if (response.ok) {
        const data = await response.json();
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: Date.now().toString() + Math.random(),
          role: msg.role === 'user' ? Role.User : Role.Assistant,
          content: msg.content,
          createdAt: new Date(msg.timestamp).getTime()
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const sendMessage = async (text: string) => {
     if (!text.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: text.trim(),
      createdAt: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setIsStreaming(true);

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Prepare placeholder for AI response
    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: Message = {
      id: aiMessageId,
      role: Role.Assistant,
      content: '',
      createdAt: Date.now(),
      isStreaming: true
    };

    setMessages(prev => [...prev, initialAiMessage]);

    // Start streaming mock response
    await generateMockResponse(userMessage.content, (chunk) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === aiMessageId) {
          return { ...msg, content: msg.content + chunk };
        }
        return msg;
      }));
    });

    // Finish streaming
    setMessages(prev => prev.map(msg => {
      if (msg.id === aiMessageId) {
        return { ...msg, isStreaming: false };
      }
      return msg;
    }));
    setIsTyping(false);
    setIsStreaming(false);
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-950 transition-colors duration-200">
      <ChatHistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentSessionId={getCurrentSessionId()}
        onSelectSession={handleSelectSession}
        isDarkMode={isDarkMode}
      />
      <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
            title="Chat History"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 md:inline-flex hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18"/>
              <path d="M3 6h18"/>
              <path d="M3 18h18"/>
            </svg>
          </Button>
          <span className="font-semibold text-gray-800 dark:text-gray-100">QA Learning Platform</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isConnected
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {getCurrentSessionId() && (
            <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300 font-medium">
              Session Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                title="Refresh Page"
                disabled={isTyping}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 17.92l-4.48 4.48"/>
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCurrentSession}
                title="Delete Chat"
                disabled={isTyping}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" x2="10" y1="11" y2="17"/>
                  <line x1="14" x2="14" y1="11" y2="17"/>
                </svg>
              </Button>
              <Button variant="ghost" size="sm" onClick={startNewSession} title="New Chat" disabled={isTyping}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                  <line x1="10" x2="8" y1="9" y2="9"/>
                </svg>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            title="Sign out"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
        <div className="mx-auto max-w-3xl h-full flex flex-col">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-1 flex-col items-center justify-center space-y-10 mt-[-50px]">
               <div className="space-y-2 text-center">
                 <h1 className="flex items-center justify-center gap-3 text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">

                    <span className="bg-gradient-to-r from-gray-800 to-gray-500 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent pb-1">
                      Hello, {user?.name?.split(' ')[0] || 'User'}
                    </span>
                 </h1>
                 <h2 className="text-2xl text-gray-400 dark:text-gray-600 font-light">How can I help you today?</h2>
               </div>
               
               <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:w-[700px]">
                  {EXAMPLE_PROMPTS.map((prompt, index) => (
                    <button 
                      key={index}
                      onClick={() => sendMessage(prompt.message)}
                      className="group flex flex-col items-start justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4 text-left transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {prompt.heading}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        {prompt.subheading}
                      </span>
                    </button>
                  ))}
               </div>
            </div>
          ) : (
            /* Message List */
            <div className="space-y-6 pb-24">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-950 dark:via-gray-950 pt-10 pb-6 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex w-full items-end rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/50 dark:shadow-none ring-offset-2 focus-within:ring-2 focus-within:ring-black/10 dark:focus-within:ring-white/10 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about documents..."
              rows={1}
              className="max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              style={{ overflowY: input.length > 0 ? 'auto' : 'hidden' }}
              disabled={isTyping}
            />
            <div className="pb-2 pr-2 flex gap-1">
              {isStreaming && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleStopStreaming}
                  title="Stop generating"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="4" height="16" x="6" y="4" rx="1"/>
                    <rect width="4" height="16" x="14" y="4" rx="1"/>
                  </svg>
                </Button>
              )}
              <Button
                size="icon"
                variant={input.trim() ? "primary" : "ghost"}
                disabled={!input.trim() || isTyping}
                onClick={() => handleSubmit()}
                className={!input.trim() ? "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-transparent dark:hover:bg-transparent" : ""}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-600">
            AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>

      {/* Mobile Chat History Button */}
      <div className="md:hidden fixed bottom-20 left-4 z-30">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-full shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </Button>
      </div>
      </div>
    </div>
  );
};
