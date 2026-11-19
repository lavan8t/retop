import React from 'react';

export const SettingTopicCard = ({
  title,
  description,
  children,
  className = '',
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`p-5 rounded-2xl bg-(--bg-surface) flex flex-col gap-4 ${className}`}
  >
    {(title || description) && (
      <div className="flex flex-col gap-1 border-b border-(--border-dim) pb-3">
        {title && (
          <h3 className="font-expanded font-semibold text-base text-(--text-main)">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs leading-relaxed text-(--text-muted)">
            {description}
          </p>
        )}
      </div>
    )}
    {children}
  </section>
);
