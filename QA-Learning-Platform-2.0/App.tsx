
import React, { useState, useEffect } from 'react';
import { AuthState, User } from './types';
import { MOCK_USER } from './constants';
import { LoginPage } from './components/LoginPage';
import { ChatInterface } from './components/ChatInterface';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);
  const [isWaitingForSuggestions, setIsWaitingForSuggestions] = useState(false);

  // Load suggestions on mount
  useEffect(() => {
    const loadSuggestions = async () => {
      // Check cache first
      const cachedSuggestions = sessionStorage.getItem('suggestions');
      if (cachedSuggestions) {
        try {
          const parsed = JSON.parse(cachedSuggestions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('[APP] Using cached suggestions:', parsed);
            setSuggestions(parsed);
            setSuggestionsLoaded(true);
            // Load fresh suggestions in background
            fetchFreshSuggestions();
            return;
          }
        } catch (e) {
          console.log('[APP] Cache parse error, fetching fresh');
        }
      }

      // No cache, load now
      await fetchFreshSuggestions();
    };

    const fetchFreshSuggestions = async () => {
      try {
        console.log('[APP] Fetching fresh suggestions from /api/v1/chat/initialize');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const resp = await fetch('/api/v1/chat/initialize', { 
          method: 'POST',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log('[APP] Response status:', resp.status);
        
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        const data = await resp.json();
        console.log('[APP] Response data:', data);
        
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          console.log('[APP] Using fresh dynamic suggestions:', data.suggestions);
          setSuggestions(data.suggestions);
          setInitialThreadId(data.thread_id || null);
          sessionStorage.setItem('suggestions', JSON.stringify(data.suggestions));
          if (data.thread_id) {
            sessionStorage.setItem('initialThreadId', data.thread_id);
          }
        } else {
          throw new Error('Invalid suggestions format');
        }
        setSuggestionsLoaded(true);
      } catch (err) {
        console.error('[APP] Failed to load suggestions:', err);
        // Use fallback only if no cache
        const cachedSuggestions = sessionStorage.getItem('suggestions');
        if (!cachedSuggestions) {
          const fallback = [
            "นิยามการประมวลผลภาพ และความสำคัญของมัน",
            "Unitary และ Fourier transform ต่างกันอย่างไร",
            "จะคำนวณสถิติภาพได้อย่างไร",
            "Sharpen Filters ใช้เพื่ออะไร"
          ];
          console.log('[APP] Using fallback suggestions:', fallback);
          setSuggestions(fallback);
          sessionStorage.setItem('suggestions', JSON.stringify(fallback));
        }
        setSuggestionsLoaded(true);
      }
    };

    loadSuggestions();
  }, []);

  useEffect(() => {
    // Check for existing session (real backend)
    const checkSession = async () => {
      const storedUser = sessionStorage.getItem('mock_user');

      if (storedUser) {
        setAuth({
          user: JSON.parse(storedUser),
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      try {
        const resp = await fetch('/api/v1/auth/me', { credentials: 'include' });
        if (resp.ok) {
          const data = await resp.json();
          if (data.user) {
            setAuth({ user: data.user, isAuthenticated: true, isLoading: false });
            return;
          }
        }
      } catch (err) {
        // ignore
      }

      setAuth(prev => ({ ...prev, isLoading: false }));
    };

    checkSession();

    // Check system preference for dark mode
    // if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    //   setIsDarkMode(true);
    // }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = () => {
    // If suggestions haven't loaded yet, show waiting modal
    if (!suggestionsLoaded) {
      setIsWaitingForSuggestions(true);
      
      // Poll until suggestions are loaded
      const checkInterval = setInterval(() => {
        if (suggestionsLoaded) {
          clearInterval(checkInterval);
          setIsWaitingForSuggestions(false);
          proceedToChat();
        }
      }, 100);
      
      return;
    }
    
    // Suggestions loaded, proceed to chat
    proceedToChat();
  };

  const proceedToChat = () => {
    // Persist mock session
    sessionStorage.setItem('mock_user', JSON.stringify(MOCK_USER));
    setAuth({
      user: MOCK_USER,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const handleLogout = () => {
    // Call backend to clear session cookie
    try {
      fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      // ignore
    }
    sessionStorage.removeItem('mock_user');
    setAuth({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  if (auth.isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAF9F6] dark:bg-[#1A1816]">
        <div className="h-10 w-10 animate-shimmer rounded-full border-2 border-[#D4A574]" />
      </div>
    );
  }

  return (
    <>
      {auth.isAuthenticated ? (
        <ChatInterface 
          user={auth.user}
          onLogout={handleLogout} 
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          initialSuggestions={suggestions}
          initialThreadId={initialThreadId}
        />
      ) : (
        <LoginPage 
          onLogin={handleLogin}
          isWaitingForSuggestions={isWaitingForSuggestions}
        />      )}
    </>
  );
};

export default App;