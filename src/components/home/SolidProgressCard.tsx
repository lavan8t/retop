import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export const SolidProgressCard = ({ progress }: { progress: number }) => (
  <div
    className={`
      bg-cyan-400 border-4 border-black rounded-3xl p-5 
      shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] 
      transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
      hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]
      relative overflow-hidden group h-full flex flex-col justify-center min-h-35 lg:min-h-0
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
        <span className="font-black text-2xl text-black leading-none">
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
        <div className="flex justify-between text-[9px] font-bold font-mono text-black/50 uppercase">
          <span>Start: Jan</span>
          <span>Target: May</span>
        </div>
      </div>
    </div>
  </div>
);
