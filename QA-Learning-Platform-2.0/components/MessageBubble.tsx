import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Message, Role } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.User;

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
             <span className="text-sm font-medium tracking-tight">LP</span>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className={`prose prose-base max-w-none leading-relaxed break-words ${
            isUser
              ? 'text-[#2B2826] dark:text-[#F5F3F0]'
              : 'text-[#2B2826] dark:text-[#F5F3F0]'
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table {...props} className="min-w-full divide-y divide-gray-300 border border-gray-300 dark:divide-gray-700 dark:border-gray-700" />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th {...props} className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800" />
                ),
                td: ({ node, ...props }) => (
                  <td {...props} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
               <span className="typing-cursor inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse" />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};