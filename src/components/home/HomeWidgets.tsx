import React, { useMemo } from "react";
import { School, CalendarMonth } from "@nine-thirty-five/material-symbols-react/rounded/700/filled";

import { AppSettings } from "../../utils/settings-store";
import { Card } from "../ui/Card";
import { Assignment, CourseSummary } from "../../types/vtop";
import { AssignmentRow } from "./HomeRows";
import { parseVtopDate } from "../../utils/formatting";

interface HomeWidgetsProps {
  className?: string;
  settings: AppSettings;
  stats: {
    cgpa: string;
    credits: string;
    totalCredits?: string;
    nonGraded?: string;
    placement?: string;
  };
  attendance?: CourseSummary[];
  assignments: Assignment[];
  onNavigate: (link: any) => void;
  isMobileFeed?: boolean;
}

export const HomeWidgets: React.FC<HomeWidgetsProps> = ({
  className,
  settings,
  stats,
  attendance = [],
  assignments,
  onNavigate,
  isMobileFeed = false,
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

  const overallAttPct = useMemo(() => {
    if (!attendance || attendance.length === 0) return "--%";
    const valid = attendance.filter((a) => !isNaN(parseFloat(a.attendance)));
    if (valid.length === 0) return "--%";
    const sum = valid.reduce((acc, a) => acc + parseFloat(a.attendance), 0);
    return Math.round(sum / valid.length) + "%";
  }, [attendance]);

  const pendingAssignments = useMemo(() => {
    return assignments
      .filter((a) => a.status !== "submitted")
      .sort((a, b) => {
        const parseDate = (dStr: string) => {
          const d = parseVtopDate(dStr);
          return d ? d.getTime() : NaN;
        };
        const dateA = parseDate(a.dueDate);
        const dateB = parseDate(b.dueDate);
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
      });
  }, [assignments]);

  // Mobile Merged CGPA & Credits Card Rendering (< lg)
  if (isMobileFeed) {
    return (
      <Card
        onClick={() =>
          onNavigate({
            title: "Grades View",
            url: "examinations/StudentGradeView",
            category: "Examinations",
          })
        }
        className={`w-full bg-(--bg-highlight) rounded-3xl p-5 sm:p-6 min-h-[120px] flex flex-col justify-between relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) hover:bg-(--bg-surface) transition-all ${className || ""}`}
      >
        <div className="flex justify-between items-start my-auto">
          <div className="flex flex-col">
            <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none mb-2">
              CGPA
            </span>
            <div
              className={`text-3xl sm:text-4xl font-black font-expanded leading-none text-(--text-main) transition-all duration-fast ${
                settings.blurCgpa ? "blur-md hover:blur-none" : ""
              }`}
            >
              {stats.cgpa || "--"}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none mb-2">
              Credits
            </span>
            <div className="text-2xl sm:text-3xl font-black font-expanded leading-none whitespace-nowrap text-(--text-main)">
              {totalEarnedStr}{" "}
              <span className="text-base sm:text-lg text-(--text-muted)">
                / {stats.totalCredits || "..."}
              </span>
            </div>
          </div>
        </div>

        {stats.placement && (
          <div
            className={`mt-3 text-[0.625rem] font-black uppercase text-center leading-none ${
              stats.placement.toLowerCase().includes("eligible")
                ? "text-(--att-safe)"
                : "text-(--att-danger)"
            }`}
          >
            {stats.placement}
          </div>
        )}
      </Card>
    );
  }

  // Original Desktop Right Column View (commit b11e407)
  return (
    <div className={`hidden lg:flex w-full lg:w-[27%] xl:w-[24%] flex-col shrink-0 h-auto lg:h-full overflow-y-auto custom-scrollbar relative z-30 pt-20 md:pt-23 lg:pt-25 pb-4 md:pb-6 lg:pb-8 pl-2 lg:pl-3 pr-4 lg:pr-6 gap-4 ${className || ""}`}>
      <Card
        onClick={() =>
          onNavigate({
            title: "Grades View",
            url: "examinations/StudentGradeView",
            category: "Examinations",
          })
        }
        className="shrink-0 h-auto bg-(--bg-highlight) rounded-4xl p-5 flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) hover:bg-(--bg-surface) transition-all duration-300 ease-out"
      >
        {/* Credits Hover Target */}
        <div className="credits-hover-group group/credits flex flex-col">
          {/* Expanded Split View */}
          <div className="cgpa-expand-container overflow-hidden relative z-10">
            <div className="overflow-hidden min-h-0 pb-4">
              <div className="flex flex-col items-center w-full">
                <div className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) mb-3 leading-none">
                  Credits
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 text-3xl font-black font-expanded leading-none">
                    <span>{gradedStr}</span>
                    <span className="text-xl text-(--text-muted)">+</span>
                    <div className="flex flex-col items-center">
                      <span>{nonGradedStr}</span>
                      <span className="text-[0.5rem] font-bold text-(--text-muted) uppercase tracking-wider -mt-0.5 leading-none">
                        NGCR
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-24 h-0.75 rounded-full bg-(--text-main) my-3"></div>

                  <div className="text-3xl font-black font-expanded leading-none text-(--text-muted)">
                    {stats.totalCredits}
                  </div>
                </div>

                {stats.placement && (
                  <div
                    className={`mt-4 text-[0.625rem] font-black uppercase text-center leading-none ${stats.placement.toLowerCase().includes("eligible") ? "text-(--att-safe)" : "text-(--att-danger)"}`}
                  >
                    {stats.placement}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resting Combined View */}
          <div className="cgpa-resting-container overflow-hidden relative z-10">
            <div className="overflow-hidden min-h-0 flex items-center justify-end pb-3">
              <div className="text-right">
                <div className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none">
                  Credits
                </div>
                <div className="text-3xl font-black font-expanded leading-none whitespace-nowrap">
                  {totalEarnedStr}{" "}
                  <span className="text-xl text-(--text-muted)">
                    / {stats.totalCredits || "..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Persistent CGPA */}
        <div
          className="flex flex-col relative z-10 transition-transform duration-300 ease-out"
        >
          <div className="flex items-center justify-between">
            <School className="w-10 h-10 text-(--text-main) mix-blend-overlay opacity-80" />
            <div className="text-right">
              <div className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none">
                CGPA
              </div>
              <div
                className={`text-3xl font-black font-expanded leading-none transition-all duration-fast ${settings.blurCgpa ? "blur-md hover:blur-none" : ""}`}
              >
                {stats.cgpa}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-visible flex flex-col min-h-0 pb-2 mt-4">
        <Card
          onClick={() => onNavigate({
            title: "Assignments",
            url: "examinations/StudentDA",
            category: "Examinations"
          })}
          className="shrink-0 bg-(--bg-highlight) rounded-4xl flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-transparent transition-all h-fit"
        >
          <div className="px-5 pt-5 border-b-2 border-(--border-main) flex justify-between items-center shrink-0">
            <div className="flex flex-col">
              <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) mb-1 leading-none">
                Pending Assignments
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-0.5 rounded-2xl overflow-hidden">
            {pendingAssignments.length > 0 ? (
              pendingAssignments.map((assignment, idx) => (
                <AssignmentRow 
                  key={idx} 
                  assignment={assignment} 
                  className="rounded-sm first:rounded-t-2xl last:rounded-b-2xl"
                />
              ))
            ) : (
              <div className="py-6 text-center text-xs text-(--text-muted) font-medium">
                you're all caught up.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
