import React, { useRef, useEffect } from 'react';

// Basic naive syntax highlighter for JSX/React
const highlightCode = (code: string) => {
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(".*?"|'.*?'|`.*?`)/g, "<span style='color: #a5d6ff;'>$1</span>") // Strings
    .replace(/\b(function|return|const|let|var|if|else|for|while|import|from|export|default|switch|case|break)\b/g, "<span style='color: #ff7b72;'>$1</span>") // Keywords
    .replace(/\b(React|useState|useMemo|useEffect|useCallback|useRef)\b/g, "<span style='color: #79c0ff;'>$1</span>") // React specifics
    .replace(/&lt;([A-Z][a-zA-Z0-9]*)/g, "&lt;<span style='color: #7ee787;'>$1</span>") // Custom components
    .replace(/&lt;([a-z][a-zA-Z0-9]*)/g, "&lt;<span style='color: #7ee787;'>$1</span>") // HTML elements
    .replace(/&lt;\/([a-zA-Z0-9]+)&gt;/g, "&lt;/<span style='color: #7ee787;'>$1</span>&gt;") // Closing tags
    .replace(/(\w+)=/g, "<span style='color: #79c0ff;'>$1</span>=") // Attributes
    .replace(/(\/\/.*)/g, "<span style='color: #8b949e;'>$1</span>"); // Comments
};

interface SyntaxHighlighterProps {
  code: string;
  onChange: (code: string) => void;
  dark?: boolean;
}

export default function SyntaxHighlighter({ code, onChange, dark }: SyntaxHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const target = e.currentTarget;
      const val = target.value;
      const newValue = val.substring(0, start) + "  " + val.substring(end);
      onChange(newValue);
      // Wait for React to update the value, then set cursor
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const bg = dark ? '#0d1117' : '#f8fafc';
  const text = dark ? '#e6edf3' : '#1e293b';

  const sharedStyles: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    padding: '16px',
    border: 'none',
    margin: 0,
    tabSize: 2,
    whiteSpace: 'pre',
    wordBreak: 'normal',
    overflowWrap: 'normal',
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: bg }}>
      {/* Background highlighted layer */}
      <pre 
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ 
          ...sharedStyles,
          color: text,
          zIndex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: highlightCode(code) || ' ' }}
      />
      {/* Foreground textarea for editing */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck="false"
        autoFocus
        className="absolute inset-0 w-full h-full resize-none bg-transparent overflow-auto outline-none transition-none"
        style={{ 
          ...sharedStyles,
          color: 'transparent', 
          caretColor: text,
          zIndex: 2,
          WebkitTextFillColor: 'transparent', // Extra insurance for some browsers
        }}
      />
    </div>
  );
}
