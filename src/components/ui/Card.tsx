import { motion, MotionProps } from "framer-motion";
import { ReactNode } from "react";
import { SPRING_SNAPPY, HOVER_LIFT, TAP_PRESS } from "../../utils/motion";

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
      whileHover={HOVER_LIFT}
      whileTap={isClickable ? TAP_PRESS : {}}
      transition={SPRING_SNAPPY}
      className={`
        border-4 ${borderClass} shadow-none transition-shadow duration-fast
        hover:shadow-(--brutal-shadow-hover)
        ${isClickable ? "cursor-pointer active:shadow-(--brutal-shadow-active)" : ""}
        ${className}
      `}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};
