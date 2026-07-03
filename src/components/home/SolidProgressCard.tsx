import { motion } from "framer-motion";
import { TrendingUp } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { Card } from "../ui/Card";

export const SolidProgressCard = ({ progress }: { progress: number }) => (
  <Card
    clickable
    className="bg-cyan-400 rounded-3xl p-5 relative overflow-hidden group flex flex-col h-full min-h-35 lg:min-h-0 select-none"
  >
    <div className="absolute -right-4 -bottom-4 opacity-[0.15] group-hover:opacity-30 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 pointer-events-none">
      <TrendingUp className="w-28 h-28 text-(--text-main)" />
    </div>

    <div className="relative z-10 w-full h-full flex flex-col justify-center gap-2">
      <div className="flex justify-between items-end mb-1">
        <h3 className="text-(--text-main) font-bold font-expanded uppercase  text-xs border-b-2 border-(--border-dim) pb-1">
          Semester Progress
        </h3>
        <span className="font-black font-expanded text-2xl text-(--text-main) leading-none drop-shadow-sm">
          {progress}%
        </span>
      </div>

      <div className="w-full mt-1">
        <div className="w-full h-3 bg-(--bg-highlight) border-2 border-(--border-dim) rounded-full overflow-hidden mb-1">
          <motion.div
            className="h-full bg-(--text-main) rounded-full opacity-80"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
          ></motion.div>
        </div>
        <div className="flex justify-between text-[9px] font-bold font-mono text-(--text-muted) uppercase mt-1.5">
          <span>Start: Jan</span>
          <span>Target: May</span>
        </div>
      </div>
    </div>
  </Card>
);
