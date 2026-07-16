import React from "react";
import { motion } from "framer-motion";
import { School } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

import { AppSettings } from "../../utils/settings-store";
import { Card } from "../ui/Card";
import { SPRING_SNAPPY } from "../../utils/motion";

interface HomeWidgetsProps {
  settings: AppSettings;
  stats: {
    cgpa: string;
    credits: string;
    totalCredits?: string;
    nonGraded?: string;
    placement?: string;
  };
  onNavigate: (link: any) => void;
}

export const HomeWidgets: React.FC<HomeWidgetsProps> = ({
  settings,
  stats,
  onNavigate,
}) => {
  const totalEarnedStr = stats.credits || "...";
  const totalEarnedNum = parseFloat(stats.credits);
  const nonGradedNum = parseFloat(stats.nonGraded || "");
  const isLoaded = !isNaN(totalEarnedNum) && !isNaN(nonGradedNum);

  const gradedStr = isLoaded
    ? (totalEarnedNum - nonGradedNum).toString().replace(/\.0$/, "")
    : "...";
  const nonGradedStr = isLoaded
    ? nonGradedNum.toString().replace(/\.0$/, "")
    : stats.nonGraded || "0";

  return (
    <div className="hidden lg:flex w-full lg:w-[24%] xl:w-[20%] flex-col shrink-0 h-auto lg:h-full relative z-30 pt-20 md:pt-24 lg:pt-28 pb-4 md:pb-6 lg:pb-8 pr-4 md:pr-6 lg:pr-0">
      <Card
        initial="rest"
        whileHover="hover"
        whileTap={{ scale: 0.98 }}
        animate="rest"
        onClick={() =>
          onNavigate({
            title: "Grades View",
            url: "examinations/StudentGradeView",
            category: "Examinations",
          })
        }
        className="group shrink-0 h-auto bg-(--bg-highlight) rounded-4xl p-5 flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:-translate-y-1 hover:shadow-(--brutal-shadow-hover) hover:bg-(--bg-surface) transition-all"
      >
        {/* Persistent CGPA */}
        <motion.div
          variants={{ rest: { y: 0 }, hover: { y: -4 } }}
          transition={SPRING_SNAPPY}
          className="flex flex-col relative z-10"
        >
          <div className="flex items-center justify-between">
            <School className="w-10 h-10 text-(--text-main) mix-blend-overlay opacity-80" />
            <div className="text-right">
              <div className="text-[10px] font-expanded font-bold uppercase text-(--text-muted)">
                CGPA
              </div>
              <div
                className={`text-3xl font-black font-expanded leading-none transition-all duration-fast ${settings.blurCgpa ? "blur-md hover:blur-none" : ""}`}
              >
                {stats.cgpa}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Resting Combined View */}
        <motion.div
          variants={{
            rest: { height: "auto", opacity: 1 },
            hover: { height: 0, opacity: 0 },
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center justify-end overflow-hidden relative z-10 mt-3"
        >
          <div className="text-right">
            <div className="text-[10px] font-expanded font-bold uppercase text-(--text-muted)">
              Credits
            </div>
            <div className="text-3xl font-black font-expanded leading-none whitespace-nowrap">
              {totalEarnedStr}{" "}
              <span className="text-xl text-(--text-muted)">
                / {stats.totalCredits || "..."}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Expanded Split View */}
        <motion.div
          variants={{
            rest: { height: 0, opacity: 0 },
            hover: { height: "auto", opacity: 1 },
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex flex-col overflow-hidden relative z-10"
        >
          <div className="flex flex-col items-center w-full pt-1">
            <div className="text-[10px] font-expanded font-bold uppercase text-(--text-muted) mb-3">
              Credits
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-3xl font-black font-expanded leading-none">
                <span>{gradedStr}</span>
                <span className="text-xl text-(--text-muted)">+</span>
                <span>{nonGradedStr}</span>
              </div>

              <div className="h-1 w-full min-w-30 bg-(--border-main) rounded-full my-2.5"></div>

              <div className="text-3xl font-black font-expanded leading-none">
                {stats.totalCredits}
              </div>
            </div>

            {stats.placement && (
              <div
                className={`mt-6 text-[10px] font-black uppercase text-center ${stats.placement.toLowerCase().includes("eligible") ? "text-(--att-safe)" : "text-(--att-danger)"}`}
              >
                {stats.placement}
              </div>
            )}
          </div>
        </motion.div>
      </Card>
    </div>
  );
};
