import React from 'react';
import { Message, Role } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.User;
  const lines = message.content.split('\n');

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm ${
          isUser 
            ? 'bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300' 
            : 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
        }`}>
          {isUser ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`prose prose-sm md:prose-base max-w-none leading-7 ${isUser ? 'text-gray-800 dark:text-gray-200' : 'text-gray-800 dark:text-gray-200'}`}>
            {lines.map((line, i) => (
               <p key={i} className="mb-1 last:mb-0 min-h-[1.5em] break-words">
                 {line}
                 {/* Cursor only appears on the last line if streaming */}
                 {i === lines.length - 1 && message.isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 translate-y-0.5 bg-gray-900 dark:bg-gray-100 animate-pulse" />
                 )}
               </p>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};