
import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, User } from '../types';
import { Button } from './Button';
import { MessageBubble } from './MessageBubble';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { generateMockResponse, createNewSession, deleteSession, getCurrentSessionId, clearCurrentSession, stopStreaming, uploadFile } from '../services/mockService';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const sendMessage = async (text: string) => {
     if ((!text.trim() && !selectedFile) || isTyping || isUploading) return;

    setIsTyping(true);
    let fileIds: string[] = [];
    let messageContent = text.trim();

    if (selectedFile) {
      setIsUploading(true);
      try {
        const response = await uploadFile(selectedFile);
        fileIds.push(response.file_id);
        messageContent += (messageContent ? '\n' : '') + `[Attached: ${selectedFile.name}]`;
      } catch (error) {
        console.error("Upload failed", error);
        setIsUploading(false);
        setIsTyping(false);
        return; // Stop if upload fails
      } finally {
        setIsUploading(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.User,
      content: messageContent,
      createdAt: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
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
    }, fileIds);

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
    <div className="flex h-screen w-full bg-[#FAF9F6] dark:bg-[#1A1816] transition-colors duration-200">
      <ChatHistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentSessionId={getCurrentSessionId()}
        onSelectSession={handleSelectSession}
        isDarkMode={isDarkMode}
      />
      <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#E8E6E1] dark:border-[#2F2D2B] bg-[#FAF9F6]/90 dark:bg-[#1A1816]/90 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
            title="Chat History"
            className="text-[#6B6662] dark:text-[#A8A29E] hover:text-[#D4A574] dark:hover:text-[#D4A574] md:inline-flex hidden transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18"/>
              <path d="M3 6h18"/>
              <path d="M3 18h18"/>
            </svg>
          </Button>
          <span className="font-serif font-semibold text-[#2B2826] dark:text-[#F5F3F0] text-lg tracking-wide">Learning Platform</span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            isConnected
              ? 'bg-[#D4A574]/10 text-[#8B7355] dark:bg-[#D4A574]/20 dark:text-[#D4A574]'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {getCurrentSessionId() && (
            <span className="rounded-full bg-[#D4A574]/10 dark:bg-[#D4A574]/20 px-3 py-1 text-xs text-[#8B7355] dark:text-[#D4A574] font-medium">
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
                className="text-[#6B6662] dark:text-[#A8A29E] hover:text-[#D4A574] dark:hover:text-[#D4A574] transition-colors"
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
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
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
            className="text-[#6B6662] dark:text-[#A8A29E] hover:text-[#D4A574] dark:hover:text-[#D4A574] transition-colors"
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
            className="text-[#6B6662] dark:text-[#A8A29E] hover:text-[#D4A574] dark:hover:text-[#D4A574] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-12 md:py-16 scroll-smooth">
        <div className="mx-auto max-w-[720px] h-full flex flex-col">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-1 flex-col items-center justify-center space-y-12 animate-fade-in">
               <div className="space-y-3 text-center">
                 <h1 className="flex items-center justify-center gap-3 font-serif text-5xl font-semibold tracking-tight text-[#2B2826] dark:text-[#F5F3F0] sm:text-6xl">
                    <span className="bg-gradient-to-br from-[#2B2826] via-[#6B6662] to-[#D4A574] dark:from-[#F5F3F0] dark:via-[#A8A29E] dark:to-[#D4A574] bg-clip-text text-transparent">
                      Hello, {user?.name?.split(' ')[0] || 'User'}
                    </span>
                 </h1>
                 <h2 className="text-2xl md:text-3xl text-[#6B6662] dark:text-[#A8A29E] font-light">How can I help you today?</h2>
               </div>

               <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 max-w-[650px]">
                  {EXAMPLE_PROMPTS.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(prompt.message)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      className="group flex flex-col items-start gap-2 rounded-2xl border border-[#E8E6E1] dark:border-[#2F2D2B] bg-[#FFFFFF] dark:bg-[#1F1D1B] p-5 text-left transition-all hover:border-[#D4A574] dark:hover:border-[#D4A574] hover:shadow-sm animate-fade-in-up opacity-0"
                    >
                      <span className="font-medium text-[#2B2826] dark:text-[#F5F3F0] group-hover:text-[#D4A574] dark:group-hover:text-[#D4A574] transition-colors">
                        {prompt.heading}
                      </span>
                      <span className="text-sm text-[#6B6662] dark:text-[#A8A29E]">
                        {prompt.subheading}
                      </span>
                    </button>
                  ))}
               </div>
            </div>
          ) : (
            /* Message List */
            <div className="space-y-8 pb-32">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6] to-transparent dark:from-[#1A1816] dark:via-[#1A1816] pt-12 pb-8 px-6">
        <div className="mx-auto max-w-[720px]">
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white dark:bg-[#1F1D1B] p-2 border border-[#E8E6E1] dark:border-[#2F2D2B] w-fit shadow-sm animate-fade-in">
              <span className="text-sm text-[#2B2826] dark:text-[#F5F3F0] truncate max-w-[200px] flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
                {selectedFile.name}
              </span>
              <button 
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }} 
                className="text-[#6B6662] hover:text-red-500 dark:text-[#A8A29E] dark:hover:text-red-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          )}
          <div className="relative flex w-full items-end rounded-2xl border border-[#E8E6E1] dark:border-[#2F2D2B] bg-[#FFFFFF] dark:bg-[#1F1D1B] shadow-lg shadow-black/5 dark:shadow-none ring-offset-2 focus-within:ring-2 focus-within:ring-[#D4A574]/20 dark:focus-within:ring-[#D4A574]/30 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.txt,.doc,.docx,.csv,.json"
            />
            <div className="pb-3 pl-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTyping || isUploading}
                title="Attach file"
                className="text-[#6B6662] dark:text-[#A8A29E] hover:text-[#D4A574] dark:hover:text-[#D4A574] hover:bg-transparent dark:hover:bg-transparent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </Button>
            </div>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about documents..."
              rows={1}
              className="max-h-[200px] min-h-[56px] w-full resize-none bg-transparent px-3 py-4 text-base text-[#2B2826] dark:text-[#F5F3F0] placeholder:text-[#6B6662] dark:placeholder:text-[#A8A29E] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              style={{ overflowY: input.length > 0 ? 'auto' : 'hidden' }}
              disabled={isTyping || isUploading}
            />
            <div className="pb-2.5 pr-2.5 flex gap-2">
              {isStreaming && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleStopStreaming}
                  title="Stop generating"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50/50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="4" height="16" x="6" y="4" rx="1"/>
                    <rect width="4" height="16" x="14" y="4" rx="1"/>
                  </svg>
                </Button>
              )}
              <Button
                size="icon"
                variant={(input.trim() || selectedFile) ? "primary" : "ghost"}
                disabled={(!input.trim() && !selectedFile) || isTyping || isUploading}
                onClick={() => handleSubmit()}
                className={(!input.trim() && !selectedFile) ? "text-[#6B6662] dark:text-[#A8A29E] hover:text-[#D4A574] dark:hover:text-[#D4A574] hover:bg-transparent dark:hover:bg-transparent" : "bg-[#D4A574] hover:bg-[#8B7355] text-white"}
              >
                {isUploading ? (
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                )}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[#6B6662] dark:text-[#A8A29E]">
            AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>

      {/* Mobile Chat History Button */}
      <div className="md:hidden fixed bottom-24 left-6 z-30">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-full shadow-lg bg-[#D4A574] hover:bg-[#8B7355] text-white"
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
