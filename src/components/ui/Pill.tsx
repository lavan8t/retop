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
    success: "bg-green-600 text-white border border-green-600",
    warning: "bg-amber-600 text-white border border-amber-600",
    error: "bg-red-600 text-white border border-red-600",
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
