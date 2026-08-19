import React, { useState } from "react";

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
  const [isFocused, setIsFocused] = useState(false);

  const currentIndex = availableGrades.indexOf(
    currentGrade === "-" ? availableGrades[availableGrades.length - 1] : currentGrade
  );

  const handleNext = () => {
    if (readonly || !availableGrades.length) return;
    const newIdx = currentIndex < availableGrades.length - 1 ? currentIndex + 1 : 0;
    onChange(availableGrades[newIdx]);
  };

  const handlePrev = () => {
    if (readonly || !availableGrades.length) return;
    const newIdx = currentIndex > 0 ? currentIndex - 1 : availableGrades.length - 1;
    onChange(availableGrades[newIdx]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (readonly) return;

    const key = e.key.toUpperCase();

    // Direct key press (S, A, B, C, D, E, F, N, P, U)
    if (availableGrades.includes(key)) {
      e.preventDefault();
      onChange(key);
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "+") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "-") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onChange("-");
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <button
        type="button"
        tabIndex={!readonly ? 0 : -1}
        onClick={!readonly ? handleNext : undefined}
        onFocus={() => !readonly && setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        title={!readonly ? "Click or type grade key (S, A, B, C, D, E, F, N)" : undefined}
        className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-3xl sm:text-4xl leading-none pt-1 shadow-none border-none outline-none transition-all duration-75 select-none ${
          isFocused
            ? "bg-(--accent-base)/20 text-(--accent-base) ring-2 ring-(--accent-base) scale-105"
            : gradeColorClass
        } ${
          !readonly
            ? "cursor-pointer active:scale-95 hover:bg-(--bg-highlight)"
            : "cursor-default"
        }`}
      >
        {currentGrade}
      </button>
    </div>
  );
};
