import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface ChatSession {
  id: string;
  thread_id: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  isDarkMode: boolean;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  currentSessionId,
  onSelectSession,
  isDarkMode
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchChatHistory();
    }
  }, [isOpen]);

  const fetchChatHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/sessions`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSessionPreview = (session: ChatSession) => {
    const userMessages = session.messages.filter(msg => msg.role === 'user');
    return userMessages.length > 0 ? userMessages[0].content.slice(0, 50) + (userMessages[0].content.length > 50 ? '...' : '') : 'New Chat';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-[#FFFFFF] dark:bg-[#1F1D1B] border-r border-[#E8E6E1] dark:border-[#2F2D2B] z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-[#E8E6E1] dark:border-[#2F2D2B]">
          <h2 className="font-serif text-xl font-semibold text-[#2B2826] dark:text-[#F5F3F0]">Chat History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[#6B6662] hover:text-[#D4A574] dark:text-[#A8A29E] dark:hover:text-[#D4A574] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-shimmer rounded-full h-8 w-8 border-2 border-[#D4A574]"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-[#6B6662] dark:text-[#A8A29E]">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-40">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
              <p className="text-sm">No chat history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    currentSessionId === session.id
                      ? 'bg-[#D4A574]/10 border-[#D4A574] dark:bg-[#D4A574]/20 dark:border-[#D4A574]'
                      : 'border-[#E8E6E1] dark:border-[#2F2D2B] hover:bg-[#FAF9F6] dark:hover:bg-[#1A1816] hover:border-[#D4A574]/50 dark:hover:border-[#D4A574]/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        currentSessionId === session.id
                          ? 'text-[#8B7355] dark:text-[#D4A574]'
                          : 'text-[#2B2826] dark:text-[#F5F3F0]'
                      }`}>
                        {getSessionPreview(session)}
                      </p>
                      <p className="text-xs text-[#6B6662] dark:text-[#A8A29E] mt-1.5">
                        {formatDate(session.updated_at)}
                      </p>
                      <p className="text-xs text-[#6B6662] dark:text-[#A8A29E] mt-1">
                        {session.messages.length} messages
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
