import React, { ElementType } from 'react';
import { SearchOff } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

interface EmptyStateProps {
  msg: React.ReactNode;
  subMsg?: React.ReactNode;
  /** Pick an icon that matches the empty context (e.g. Event, SearchOff). */
  icon?: ElementType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  msg,
  subMsg,
  icon: Icon = SearchOff,
  className = '',
  size = 'lg',
}) => {
  const containerSizeClass = {
    sm: 'min-h-32 p-4',
    md: 'min-h-48 p-6',
    lg: 'min-h-64 p-8',
  }[size];

  const iconSizeClass = {
    sm: 'w-12 h-12 mb-3',
    md: 'w-16 h-16 mb-4',
    lg: 'w-24 h-24 mb-6',
  }[size];

  const textSizeClass = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center h-full w-full text-(--text-muted) ${containerSizeClass} ${className}`}
    >
      <Icon
        aria-hidden="true"
        className={`${iconSizeClass} text-(--accent-base) shrink-0`}
      />
      <span
        className={`${textSizeClass} text-center font-medium font-expanded`}
      >
        {msg}
      </span>
      {subMsg && (
        <p className="mt-4 text-sm font-medium opacity-80 text-center max-w-md">
          {subMsg}
        </p>
      )}
    </div>
  );
};
