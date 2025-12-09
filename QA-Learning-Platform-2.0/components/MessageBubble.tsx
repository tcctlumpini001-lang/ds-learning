import React from 'react';
import { Message, Role } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.User;
  const lines = message.content.split('\n');

  return (
    <div className="flex w-full animate-fade-in-up">
      <div className="flex w-full items-start gap-4 md:gap-5">

        {/* Avatar */}
        <div className={`flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border transition-all ${
          isUser
            ? 'bg-[#FFFFFF] border-[#E8E6E1] text-[#6B6662] dark:bg-[#1F1D1B] dark:border-[#2F2D2B] dark:text-[#A8A29E]'
            : 'bg-[#2B2826] text-[#FAF9F6] border-[#2B2826] dark:bg-[#F5F3F0] dark:text-[#1A1816] dark:border-[#F5F3F0]'
        }`}>
          {isUser ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className={`prose prose-base max-w-none leading-relaxed ${
            isUser
              ? 'text-[#2B2826] dark:text-[#F5F3F0]'
              : 'text-[#2B2826] dark:text-[#F5F3F0]'
          }`}>
            {lines.map((line, i) => (
               <p key={i} className="mb-2 last:mb-0 min-h-[1.75em] break-words">
                 {line || '\u00A0'}
                 {i === lines.length - 1 && message.isStreaming && (
                    <span className="typing-cursor" />
                 )}
               </p>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};