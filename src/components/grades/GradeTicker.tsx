import React from "react";
import { Tooltip } from "../ui/Tooltip";

interface GradeTickerProps {
  currentGrade: string;
  gradeColorClass: string;
  onChange: (newGrade: string) => void;
  availableGrades: string[];
  readonly?: boolean;
}

export const GradeTicker: React.FC<GradeTickerProps> = ({
  currentGrade,
  gradeColorClass,
  onChange,
  availableGrades,
  readonly,
}) => {
  const currentIndex = availableGrades.indexOf(
    currentGrade === "-" ? availableGrades[availableGrades.length - 1] : currentGrade
  );

  const handleNext = () => {
    if (readonly || !availableGrades.length) return;
    const newIdx = currentIndex < availableGrades.length - 1 ? currentIndex + 1 : 0;
    onChange(availableGrades[newIdx]);
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-1">
      <Tooltip text={!readonly ? "Click to change grade" : ""}>
        <div
          onClick={!readonly ? handleNext : undefined}
          className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-4xl leading-none pt-1.5 ${gradeColorClass} shadow-none border-2 border-transparent transition-all ${
            !readonly
              ? "cursor-pointer select-none active:scale-95 hover:bg-(--bg-surface) hover:ring-2 hover:ring-(--border-main)"
              : ""
          }`}
        >
          {currentGrade}
        </div>
      </Tooltip>
    </div>
  );
};
