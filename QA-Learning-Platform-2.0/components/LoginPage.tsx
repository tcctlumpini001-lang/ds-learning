import React, { useState } from 'react';
import { Button } from './Button';
import { DEV_BYPASS_KEY } from '../constants';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    // Redirect browser to backend to start Google OAuth flow
    window.location.href = '/api/v1/auth/google';
  };

  const handleDevBypass = () => {
    // Set a flag so we can remember this preference
    sessionStorage.setItem(DEV_BYPASS_KEY, 'true');
    onLogin();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black shadow-xl">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/></svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to access your AI assistant</p>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          <Button 
            variant="outline" 
            className="w-full relative h-10" 
            onClick={handleGoogleLogin}
            isLoading={isLoggingIn}
          >
            {!isLoggingIn && (
              <svg className="mr-2 h-4 w-4 dark:text-white" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-400 dark:text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="ghost" 
            className="w-full text-gray-500 dark:text-gray-400" 
            onClick={handleDevBypass}
          >
            Dev Mode (Bypass Auth)
          </Button>
        </div>
      </div>
    </div>
  );
};