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

function sanitizeForMath(content: string): string {
  // Remove OpenAI-style citation markers like 【...†...】
  const cleaned = content.replace(/【.*?†.*?】/g, '');
  // Strip square brackets that wrap lines: [ ... ] → ...
  const lines = cleaned.split('\n').map(line => {
    const trimmed = line.trim();
    // Remove lines that are just a single bracket
    if (trimmed === '[' || trimmed === ']') {
      return '';
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed.slice(1, -1);
    }
    return line;
  });
  return lines.join('\n');
}

function normalizeMathDelimiters(content: string): string {
  // If lines contain LaTeX commands but no $ delimiters, wrap them so rehype-katex can render.
  const latexHints = /(\\frac|\\sqrt|\\partial|\\nabla|\\tan|\\text|\\left|\\right|\\approx|\\sum|\\int|\\vec|\\begin\{[a-zA-Z]+\}|\\end\{[a-zA-Z]+\})/;
  let text = content;
  // Ensure environments like bmatrix are wrapped as block math
  text = text.replace(/\\begin\{bmatrix\}/g, '$$\\begin{bmatrix}');
  text = text.replace(/\\end\{bmatrix\}/g, '\\end{bmatrix}$$');

  const lines = text.split('\n').map(line => {
    const trimmed = line.trim();
    // Convert 'text{...}' to '\\text{...}' if missing leading backslash
    const fixedText = trimmed.replace(/(^|[^\\])text\{/g, '$1\\text{');
    // Heuristic: if contains LaTeX and no $ delimiters, wrap as block $$...$$
    if (latexHints.test(fixedText) && fixedText.indexOf('$') === -1) {
      return `$$\n${fixedText}\n$$`;
    }
    return fixedText;
  });
  return lines.join('\n');
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.User;
  const contentSanitized = sanitizeForMath(message.content || '');
  const content = normalizeMathDelimiters(contentSanitized);

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
          <div className={`prose prose-base max-w-none leading-[1.75] break-words ${
            isUser
              ? 'text-[#2B2826] dark:text-[#F5F3F0]'
              : 'text-[#2B2826] dark:text-[#F5F3F0]'
          }`}
          style={{
            fontSize: '15px',
            lineHeight: '1.75'
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ node, ...props }) => (
                  <p {...props} className="mb-4 last:mb-0" style={{ lineHeight: '1.8', marginTop: '0.5rem' }} />
                ),
                ul: ({ node, ...props }) => (
                  <ul {...props} className="my-5 space-y-3 list-disc pl-6" style={{ marginLeft: '0.5rem' }} />
                ),
                ol: ({ node, ...props }) => (
                  <ol {...props} className="my-5 space-y-3 list-decimal pl-6" style={{ marginLeft: '0.5rem' }} />
                ),
                li: ({ node, ...props }) => (
                  <li {...props} className="ml-1 pl-2" style={{ lineHeight: '1.8', marginBottom: '0.75rem' }} />
                ),
                h1: ({ node, ...props }) => (
                  <h1 {...props} className="text-2xl font-bold mt-6 mb-4 first:mt-0" />
                ),
                h2: ({ node, ...props }) => (
                  <h2 {...props} className="text-xl font-bold mt-5 mb-3 first:mt-0" />
                ),
                h3: ({ node, ...props }) => (
                  <h3 {...props} className="text-lg font-semibold mt-4 mb-2 first:mt-0" />
                ),
                code: ({ node, inline, ...props }: any) => 
                  inline ? (
                    <code {...props} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono" />
                  ) : (
                    <code {...props} className="block p-3 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono overflow-x-auto" />
                  ),
                pre: ({ node, ...props }) => (
                  <pre {...props} className="my-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-x-auto" />
                ),
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline" />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote {...props} className="my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-700 dark:text-gray-300" />
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
              {content}
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