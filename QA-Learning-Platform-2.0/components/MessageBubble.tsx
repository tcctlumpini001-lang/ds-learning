import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Message, Role } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.User;
  
  // Add cursor if streaming
  const content = message.isStreaming ? message.content + '▍' : message.content;

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
          <div className={`prose prose-base max-w-none leading-relaxed ${
            isUser
              ? 'text-[#2B2826] dark:text-[#F5F3F0]'
              : 'text-[#2B2826] dark:text-[#F5F3F0]'
          }`}>
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({node, ...props}) => <p className="mb-2 last:mb-0 min-h-[1.75em] break-words" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>

      </div>
    </div>
  );
};