import { motion } from "framer-motion";

export const ListCard = ({
  title,
  count,
  bgClass,
  borderClass,
  headerAction,
  onClick,
  children,
}: any) => (
  <motion.div
    layout
    onClick={onClick}
    className={`
      bg-(--bg-highlight) border-4 ${borderClass} rounded-4xl 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] 
      flex flex-col h-auto lg:h-full overflow-hidden min-h-0 lg:min-h-62.5
      transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]
      ${onClick ? "cursor-pointer group" : ""}
    `}
  >
    <div
      className={`${bgClass} px-5 py-3.5 border-b-4 border-black flex justify-between items-center shrink-0 z-10`}
    >
      <h3 className="font-expanded font-black text-lg text-black uppercase tracking-tighter flex items-center gap-2 m-0 leading-none">
        {title}
      </h3>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="text-[11px] font-black font-mono text-black bg-white/50 px-2 py-0.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
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
  </motion.div>
);
