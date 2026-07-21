import React from "react";
import { UpcomingClass } from "../../utils/timetable-slots";
import { Assignment, Event } from "../../types/vtop";
import { ScheduleRow, AssignmentRow, EventRow } from "./HomeRows";

interface LazyCalendarDayProps {
  d: Date;
  dIdx: number;
  calGridData: any[];
  eventFilter: "all" | "classes" | "assignments" | "events";
  assignments: Assignment[];
  events: Event[];
  getClassesForDate: (d: Date, calEvent: any) => UpcomingClass[];
  use24HourTime: boolean;
  nowRef: React.RefObject<HTMLDivElement | null>;
  todayRef?: React.RefObject<HTMLDivElement | null>;
  onNavigate?: (link: any) => void;
}

export const LazyCalendarDay = React.memo(({
  d,
  dIdx,
  calGridData,
  eventFilter,
  assignments,
  events,
  getClassesForDate,
  use24HourTime,
  todayRef,
  nowRef,
  onNavigate
}: LazyCalendarDayProps) => {
  const isToday = d.toDateString() === new Date().toDateString();

  let calEvent: any = null;
  for (const monthData of calGridData) {
    for (const calDay of monthData.days) {
      if (
        calDay.dateObj &&
        new Date(calDay.dateObj).toDateString() === d.toDateString()
      ) {
        calEvent = calDay;
        break;
      }
    }
    if (calEvent) break;
  }

  const classesForDay = getClassesForDate(d, calEvent);

  const dayEvents: Array<
    | { type: "class"; data: UpcomingClass }
    | { type: "assignment"; data: Assignment }
    | { type: "event"; data: Event }
    | { type: "calendar"; data: any }
  > = [];

  if (calEvent && (calEvent.info || calEvent.isHoliday)) {
    dayEvents.push({ type: "calendar", data: calEvent });
  }

  if (eventFilter === "all" || eventFilter === "classes") {
    classesForDay.forEach((c: any) =>
      dayEvents.push({ type: "class", data: c }),
    );
  }
  if (eventFilter === "all" || eventFilter === "assignments") {
    if (isToday) {
      [...assignments]
        .sort((a: any, b: any) => {
          const parseDate = (dStr: string) => {
            if (!dStr) return NaN;
            // Standardize format by replacing slashes and dashes
            const cleanStr = dStr.replace(/[-/]/g, " ").trim();
            // Try standard Date parsing
            const t = new Date(cleanStr).getTime();
            if (!isNaN(t)) return t;
            
            // If it fails, maybe it's DD MM YYYY. Let's try to parse manually
            const parts = cleanStr.split(" ");
            if (parts.length >= 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // 0-indexed
              const year = parseInt(parts[2], 10);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return new Date(year, month, day).getTime();
              }
            }
            return NaN;
          };

          const dateA = parseDate(a.dueDate);
          const dateB = parseDate(b.dueDate);
          
          if (isNaN(dateA) && isNaN(dateB)) return 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          return dateA - dateB;
        })
        .forEach((a: any) =>
          dayEvents.push({ type: "assignment", data: a }),
        );
    }
  }
  if (eventFilter === "all" || eventFilter === "events") {
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    events
      .filter((e: any) => e.date === dStr)
      .forEach((e: any) => dayEvents.push({ type: "event", data: e }));
  }
  if (dayEvents.length === 0) {
    return null;
  }

  const currentHour = new Date().getHours();

  const eventsWithStatus = dayEvents.map((evt) => {
    let isDone = false;
    if (isToday) {
      if (evt.type === "class") {
        const timeParts = evt.data.time.split("-");
        const endHour =
          timeParts.length > 1
            ? parseInt(timeParts[1])
            : parseInt(timeParts[0]);
        isDone = currentHour > endHour;
      } else if (evt.type === "assignment") {
        isDone = evt.data.status === "submitted";
      } else if (evt.type === "event" || evt.type === "calendar") {
        isDone = false;
      }
    } else if (d < new Date(new Date().setHours(0, 0, 0, 0))) {
      isDone = true;
    }
    return { ...evt, isDone };
  });

  const calendarEvents = eventsWithStatus.filter((e) => e.type === "calendar");
  const otherEvents = eventsWithStatus.filter((e) => e.type !== "calendar");
  const doneEvents = otherEvents.filter((e) => e.isDone);
  const upcomingEvents = otherEvents.filter((e) => !e.isDone);

  return (
    <div
      ref={isToday ? todayRef : undefined}
      className={`mb-4 flex gap-3 relative ${isToday ? "scroll-mt-[30vh]" : ""}`}
    >
      <div className="flex flex-col items-center shrink-0 w-12 pt-1 sticky top-4 h-fit z-10">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-0.5 ${isToday ? "bg-(--accent-base) text-(--text-inverse)" : "text-(--text-main)"}`}
        >
          {d.getDate()}
        </div>
        <div
          className={`text-[9px] font-expanded font-bold uppercase ${isToday ? "text-(--accent-base)" : "text-(--text-main)"}`}
        >
          {d.toLocaleDateString("en-US", { weekday: "short" })}
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 min-w-0 pb-4 border-l-2 border-(--border-dim) pl-4">
        {calendarEvents.map((evt: any, i: number) => (
          <div
            key={`cal-${i}`}
            className="w-full text-left pb-2 flex flex-col opacity-100"
          >
            <span
              className={`font-black font-expanded uppercase text-base md:text-lg ${evt.data.isHoliday ? "text-att-danger" : "text-(--text-main)"}`}
            >
              {evt.data.info}
            </span>
            {evt.data.subInfo && (
              <span className="text-xs text-(--text-muted) font-bold mt-1">
                {evt.data.subInfo}
              </span>
            )}
          </div>
        ))}

        {doneEvents.filter((e: any) => e.type !== "class").map((evt: any, i: number) => (
          <div
            key={`done-${i}`}
            className="opacity-50 grayscale-50 pointer-events-none transition-all"
          >
            {evt.type === "assignment" ? (
              <AssignmentRow 
                assignment={evt.data as Assignment} 
                onClick={() => onNavigate && onNavigate({ title: "Digital Assignments", url: "examinations/StudentDA", category: "Examinations" })}
              />
            ) : evt.type === "calendar" ? (
              <div
                className={`w-full text-left p-3 rounded-xl flex items-center justify-between border-2 border-transparent hover:border-(--border-main) shadow-none mb-3 ${evt.data.isHoliday ? "bg-red-500/10" : "bg-(--bg-surface)"}`}
              >
                <div className="flex flex-col">
                  <span
                    className={`font-black uppercase text-xs ${evt.data.isHoliday ? "text-att-danger" : "text-(--text-main)"}`}
                  >
                    {evt.data.info}
                  </span>
                  {evt.data.subInfo && (
                    <span className="text-[10px] text-(--text-muted) font-bold">
                      {evt.data.subInfo}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <EventRow event={evt.data as Event} />
            )}
          </div>
        ))}

        {isToday &&
          doneEvents.length > 0 &&
          upcomingEvents.length > 0 && (
            <div
              ref={nowRef}
              className="flex items-center gap-2 my-1 relative -ml-6 scroll-mt-[40vh]"
            >
              <div className="w-4 h-0.75 rounded-full bg-(--accent-base)"></div>
              <div className="w-2 h-2 rounded-full bg-(--accent-base) shrink-0"></div>
              <div className="h-0.75 rounded-full flex-1 bg-linear-to-r from-(--accent-base) to-transparent opacity-50"></div>
            </div>
          )}
        {isToday &&
          doneEvents.length === 0 &&
          upcomingEvents.length > 0 && (
            <div
              ref={nowRef}
              className="flex items-center gap-2 mb-1 relative -ml-6 scroll-mt-[40vh]"
            >
              <div className="w-4 h-0.75 rounded-full bg-(--accent-base)"></div>
              <div className="w-2 h-2 rounded-full bg-(--accent-base) shrink-0"></div>
              <div className="h-0.75 rounded-full flex-1 bg-linear-to-r from-(--accent-base) to-transparent opacity-50"></div>
            </div>
          )}

        {upcomingEvents.map((evt: any, i: number) => (
          <div
            key={`upcoming-${i}`}
            className={isToday ? "opacity-100" : "opacity-80"}
          >
            {evt.type === "class" ? (
              <ScheduleRow
                item={evt.data as UpcomingClass}
                onClick={() => onNavigate && onNavigate({ title: "Timetable", url: "academics/common/StudentTimeTable", category: "Academics" })}
                use24HourTime={use24HourTime}
              />
            ) : evt.type === "assignment" ? (
              <AssignmentRow 
                assignment={evt.data as Assignment} 
                onClick={() => onNavigate && onNavigate({ title: "Digital Assignments", url: "examinations/StudentDA", category: "Examinations" })}
              />
            ) : evt.type === "calendar" ? (
              <div className="w-full text-left pb-3 flex flex-col">
                <span
                  className={`font-black font-expanded uppercase text-base md:text-lg ${evt.data.isHoliday ? "text-att-danger" : "text-(--text-main)"}`}
                >
                  {evt.data.info}
                </span>
                {evt.data.subInfo && (
                  <span className="text-xs text-(--text-muted) font-bold mt-1">
                    {evt.data.subInfo}
                  </span>
                )}
              </div>
            ) : (
              <EventRow event={evt.data as Event} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
