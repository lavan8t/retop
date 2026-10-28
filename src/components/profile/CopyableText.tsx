import React from 'react';

export const CopyableText = ({
  text,
  children,
  className = '',
}: {
  text: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <span
      className={`cursor-pointer hover:underline decoration-2 underline-offset-4 transition-all ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        window.dispatchEvent(
          new CustomEvent('retop-toast', {
            detail: { message: 'Copied!', type: 'info' },
          }),
        );
      }}
      title="Click to copy"
    >
      {children || text}
    </span>
  );
};
