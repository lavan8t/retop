import { motion } from "framer-motion";

export const SolidStatCard = ({
  title,
  value,
  subtitle,
  bgClass,
  icon: Icon,
}: any) => (
  <motion.div
    initial={{ boxShadow: "6px 6px 0px 0px var(--shadow-main)" }}
    whileHover={{ y: -6, boxShadow: "10px 10px 0px 0px var(--shadow-main)" }}
    whileTap={{
      scale: 0.95,
      y: 0,
      boxShadow: "4px 4px 0px 0px var(--shadow-main)",
    }}
    transition={{
      default: { type: "spring", stiffness: 400, damping: 25 },
      boxShadow: { type: "tween", duration: 0.3 },
    }}
    className={`
      ${bgClass} border-4 border-black rounded-3xl p-5 
      relative overflow-hidden group h-full flex flex-col justify-center min-h-35 lg:min-h-0 cursor-pointer select-none
    `}
  >
    <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <Icon className="w-28 h-28 text-black" />
    </div>
    <div className="relative z-10 flex flex-col justify-center h-full">
      <h3 className="text-black font-bold font-expanded uppercase tracking-widest text-xs border-b-2 border-black/20 pb-1 w-fit mb-1">
        {title}
      </h3>
      <div className="text-4xl md:text-5xl font-black font-expanded text-black tracking-tighter leading-none drop-shadow-sm mt-1">
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] font-bold font-mono text-black/60 uppercase mt-2 tracking-wide">
          {subtitle}
        </p>
      )}
    </div>
  </motion.div>
);
