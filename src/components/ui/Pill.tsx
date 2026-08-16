import React from "react";

export type PillVariant = "accent" | "surface" | "main" | "success" | "muted" | "outline" | "error" | "warning";

interface PillProps {
  children: React.ReactNode;
  variant?: PillVariant;
  className?: string;
}

export const Pill: React.FC<PillProps> = ({
  children,
  variant = "surface",
  className = "",
}) => {
  const variantClasses: Record<PillVariant, string> = {
    accent: "bg-(--accent-base) text-(--text-inverse) border border-(--accent-base)",
    surface: "bg-(--bg-surface) text-(--text-main) border border-(--border-dim)/60",
    main: "bg-(--bg-main) text-(--text-main) border border-(--border-dim)/60",
    success: "bg-(--att-safe-container) text-(--att-safe) border border-(--att-safe)/30",
    warning: "bg-(--att-warn-container) text-(--att-warn) border border-(--att-warn)/30",
    error: "bg-(--att-danger-container) text-(--att-danger) border border-(--att-danger)/30",
    muted: "bg-(--bg-highlight) text-(--text-muted) border border-(--border-dim)/40",
    outline: "bg-transparent text-(--text-main) border border-(--border-dim)",
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider inline-flex items-center gap-1 shrink-0 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
