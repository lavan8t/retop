import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export const SolidProgressCard = ({ progress }: { progress: number }) => (
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
      bg-cyan-400 border-4 border-black rounded-3xl p-5 
      relative overflow-hidden group h-full flex flex-col justify-center min-h-35 lg:min-h-0 cursor-pointer select-none
    `}
  >
    <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <TrendingUp className="w-28 h-28 text-black" />
    </div>

    <div className="relative z-10 w-full h-full flex flex-col justify-center gap-2">
      <div className="flex justify-between items-end mb-1">
        <h3 className="text-black font-bold font-expanded uppercase tracking-widest text-xs border-b-2 border-black/20 pb-1">
          Semester Progress
        </h3>
        <span className="font-black font-expanded text-2xl text-black leading-none drop-shadow-sm">
          {progress}%
        </span>
      </div>

      <div className="w-full mt-1">
        <div className="w-full h-3 bg-black/10 border-2 border-black/20 rounded-full overflow-hidden mb-1">
          <motion.div
            className="h-full bg-black rounded-full opacity-80"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
          ></motion.div>
        </div>
        <div className="flex justify-between text-[9px] font-bold font-mono text-black/50 uppercase mt-1.5">
          <span>Start: Jan</span>
          <span>Target: May</span>
        </div>
      </div>
    </div>
  </motion.div>
);
