import React from "react";

export type EventFilterType = "all" | "classes" | "assignments" | "events";

interface FilterChipsProps {
  eventFilter: EventFilterType;
  setEventFilter: (filter: EventFilterType) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  eventFilter,
  setEventFilter,
}) => {
  return (
    <div className="flex items-center justify-center gap-0.5 shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEventFilter("all");
        }}
        className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
          eventFilter === "all"
            ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
            : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-l-[20px] rounded-r-md shadow-none"
        }`}
      >
        All
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEventFilter("classes");
        }}
        className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
          eventFilter === "classes"
            ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
            : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-md shadow-none"
        }`}
      >
        Classes
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEventFilter("assignments");
        }}
        className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
          eventFilter === "assignments"
            ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
            : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-md shadow-none"
        }`}
      >
        Tasks
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEventFilter("events");
        }}
        className={`px-3 md:px-5 py-1.5 text-xs font-bold transition-all duration-fast ${
          eventFilter === "events"
            ? "bg-(--text-main) text-(--bg-main) rounded-[20px] shadow-none"
            : "bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) rounded-l-md rounded-r-[20px] shadow-none"
        }`}
      >
        Events
      </button>
    </div>
  );
};
