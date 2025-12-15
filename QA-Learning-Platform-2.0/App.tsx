
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
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;
