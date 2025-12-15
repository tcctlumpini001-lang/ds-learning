import React, { useState } from 'react';
import { Button } from './Button';

interface LoginPageProps {
  onLogin: () => void;
  isWaitingForSuggestions?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isWaitingForSuggestions = false }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    // Redirect browser to backend to start Google OAuth flow
    window.location.href = '/api/v1/auth/google';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F6] dark:bg-[#1A1816] px-4 transition-colors animate-fade-in">
      <div className="w-full max-w-md space-y-10 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2B2826] dark:bg-[#F5F3F0] text-[#FAF9F6] dark:text-[#1A1816] shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/></svg>
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#2B2826] dark:text-[#F5F3F0]">Welcome back</h1>
          <p className="text-base text-[#6B6662] dark:text-[#A8A29E]">Sign in to access your Learning assistant</p>
        </div>

        <div className="space-y-5 rounded-2xl border border-[#E8E6E1] dark:border-[#2F2D2B] bg-[#FFFFFF] dark:bg-[#1F1D1B] p-8 shadow-lg shadow-black/5 dark:shadow-none">
          <Button
            variant="outline"
            className="w-full relative h-12 border-[#E8E6E1] dark:border-[#2F2D2B] hover:border-[#D4A574] dark:hover:border-[#D4A574] hover:bg-[#FAF9F6] dark:hover:bg-[#1A1816] transition-all"
            onClick={handleGoogleLogin}
            isLoading={isLoggingIn}
          >
            {!isLoggingIn && (
              <svg className="mr-2 h-5 w-5 text-[#2B2826] dark:text-[#F5F3F0]" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            <span className="text-[#2B2826] dark:text-[#F5F3F0] font-medium">Sign in with Google</span>
          </Button>
        </div>
      </div>

      {/* Loading Modal - Show when waiting for suggestions */}
      {isWaitingForSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1F1D1B] rounded-2xl p-8 text-center shadow-xl">
            <div className="h-10 w-10 mx-auto mb-4 animate-spin border-2 border-[#D4A574] border-t-transparent rounded-full" />
            <p className="text-[#2B2826] dark:text-[#F5F3F0] font-medium">
              กำลังเตรียมข้อมูล...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
