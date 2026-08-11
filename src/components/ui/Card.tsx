import { ReactNode } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  onClick?: (e?: any) => void;
  onMouseEnter?: (e?: any) => void;
  onMouseLeave?: (e?: any) => void;
  clickable?: boolean;
  borderClass?: string;
}

export const Card = ({
  children,
  className = "",
  onClick,
  clickable = false,
  borderClass = "border-(--border-main)",
  ...rest
}: CardProps) => {
  const isClickable = clickable || !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
        border-4 ${borderClass} shadow-none transition-all duration-200
        ${isClickable ? "cursor-pointer active:translate-y-0 active:shadow-(--brutal-shadow-active)" : ""}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};
