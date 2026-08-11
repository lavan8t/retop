import React from "react";

export const SettingTopicCard = ({
  title,
  description,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`p-6 rounded-3xl bg-transparent border-2 border-(--border-dim) flex flex-col gap-4 ${className}`}
  >
    {(title || description) && (
      <div className="flex flex-col gap-1 border-b-2 border-(--border-dim) pb-4">
        {title && (
          <h3 className="font-expanded font-black text-lg md:text-xl text-(--text-main)">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs md:text-sm font-medium text-(--text-muted)">
            {description}
          </p>
        )}
      </div>
    )}
    {children}
  </div>
);
