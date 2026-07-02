import { motion } from "framer-motion";
import { Card } from "../ui/Card";
import { NorthEast } from "@nine-thirty-five/material-symbols-react/rounded";

export const ListCard = ({
  title,
  count,
  bgClass,
  borderClass,
  headerAction,
  onClick,
  onClickTitle,
  children,
}: any) => (
  <Card
    layout
    onClick={onClick}
    borderClass={borderClass}
    className={`
      bg-(--bg-highlight) rounded-4xl 
      flex flex-col h-auto lg:h-full overflow-hidden min-h-0 lg:min-h-62.5
      group
    `}
  >
    <div
      className={`${bgClass} px-5 py-3.5 border-b-4 border-(--border-main) flex justify-between items-center shrink-0 z-10 group/header relative ${onClickTitle ? "cursor-pointer hover:bg-(--border-main) transition-colors" : ""}`}
      onClick={onClickTitle}
    >
      <h3 className="font-expanded font-black text-lg text-(--text-main) uppercase flex items-center gap-2 m-0 leading-none">
        {title}
        {onClickTitle && (
          <NorthEast className="w-5 h-5 opacity-0 -translate-x-2 translate-y-2 group-hover/header:opacity-100 group-hover/header:translate-x-0 group-hover/header:translate-y-0 transition-all duration-300" />
        )}
      </h3>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="text-[11px] font-black font-mono text-(--text-main) bg-(--bg-surface) px-2 py-0.5 rounded-lg border-2 border-(--border-main) shadow-none">
            {count}
          </span>
        )}
        {headerAction}
      </div>
    </div>

    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
      className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-(--bg-highlight)"
    >
      {children}
    </motion.div>
  </Card>
);
