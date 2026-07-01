import { motion, MotionProps } from "framer-motion";
import { ReactNode } from "react";

interface CardProps extends MotionProps {
  children: ReactNode;
  className?: string;
  onClick?: (e?: any) => void;
  onMouseEnter?: (e?: any) => void;
  onMouseLeave?: (e?: any) => void;
  clickable?: boolean;
  layout?: boolean;
  borderClass?: string;
}

export const Card = ({
  children,
  className = "",
  onClick,
  clickable = false,
  layout,
  borderClass = "border-(--border-main)",
  ...motionProps
}: CardProps) => {
  const isClickable = clickable || !!onClick;

  return (
    <motion.div
      layout={layout}
      onClick={onClick}
      whileHover={{ y: -6 }}
      whileTap={isClickable ? { scale: 0.95, y: 0 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`
        border-4 ${borderClass} shadow-none transition-shadow duration-300
        hover:shadow-[6px_6px_0px_0px_var(--shadow-main)]
        ${isClickable ? "cursor-pointer active:shadow-[4px_4px_0px_0px_var(--shadow-main)]" : ""}
        ${className}
      `}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};
