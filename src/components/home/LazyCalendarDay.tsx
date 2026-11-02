import React from 'react';
import { UpcomingClass } from '../../utils/timetable-slots';
import { Assignment, Event } from '../../types/vtop';
import { ScheduleRow, AssignmentRow, EventRow, ExamRow } from './HomeRows';
import { ExamGroup, isSameDayExam } from '../../parsers/exam-schedule';
import { useDataStore } from '../../store/dataStore';
import {
  useSettingsStore,
  getMaterialThemeColor,
  getMaterialOnThemeColor,
} from '../../utils/settings-store';
import { useIsDark } from '../../hooks/useTheme';
import { parseVtopDate, TimeFormatMode } from '../../utils/formatting';
import { openAssignmentInDA } from '../../utils/daNavigation';

import {
  School,
  KeyboardArrowDown,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

interface LazyCalendarDayProps {
  d: Date;
  dIdx: number;
  calGridData: any[];
  eventFilter: 'all' | 'classes' | 'assignments' | 'events';
  assignments: Assignment[];
  events: Event[];
  examGroups?: ExamGroup[];
  getClassesForDate: (d: Date, calEvent: any) => UpcomingClass[];
  use24HourTime: TimeFormatMode;

  nowRef: React.RefObject<HTMLDivElement | null>;
  todayRef?: React.RefObject<HTMLDivElement | null>;
  onNavigate?: (link: any) => void;
}

export const LazyCalendarDay = React.memo(
  ({
    d,
    dIdx,
    calGridData,
    eventFilter,
    assignments,
    events,
    examGroups = [],
    getClassesForDate,
    use24HourTime,
    todayRef,
    nowRef,
    onNavigate,
  }: LazyCalendarDayProps) => {
    const { settings } = useSettingsStore();
    const isDark = useIsDark();
    const [showCompleted, setShowCompleted] = React.useState(false);

    const calHolidayBg = getMaterialThemeColor('red', isDark);
    const calHolidayFg = getMaterialOnThemeColor('red', isDark);
    const calEventBg = getMaterialThemeColor(
      settings.calendarEventColor,
      isDark,
    );
    const calEventFg = getMaterialOnThemeColor(
      settings.calendarEventColor,
      isDark,
    );

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

    const dayExams: { exam: any; groupType: string }[] = [];
    if (examGroups && examGroups.length > 0) {
      for (const grp of examGroups) {
        for (const entry of grp.entries) {
          if (entry.examDate && isSameDayExam(entry.examDate, d)) {
            dayExams.push({ exam: entry, groupType: grp.examType });
          }
        }
      }
    }

    const dayEvents: Array<
      | { type: 'class'; data: UpcomingClass }
      | { type: 'assignment'; data: Assignment }
      | { type: 'event'; data: Event }
      | { type: 'exam'; data: { exam: any; groupType: string } }
      | { type: 'calendar'; data: any }
    > = [];

    if (calEvent && (calEvent.info || calEvent.isHoliday)) {
      const isGenericInstructionalText =
        calEvent.info && /instructional\s*day/i.test(calEvent.info);
      if (!isGenericInstructionalText || calEvent.isHoliday) {
        dayEvents.push({ type: 'calendar', data: calEvent });
      }
    }

    if (
      eventFilter === 'all' ||
      eventFilter === 'events' ||
      eventFilter === 'classes'
    ) {
      dayExams.forEach((ex) => dayEvents.push({ type: 'exam', data: ex }));
    }

    if (eventFilter === 'all' || eventFilter === 'classes') {
      const shouldShowClasses = calEvent ? calEvent.isInstructional : true;
      if (shouldShowClasses) {
        classesForDay.forEach((c: any) =>
          dayEvents.push({ type: 'class', data: c }),
        );
      }
    }
    if (eventFilter === 'all' || eventFilter === 'assignments') {
      if (isToday) {
        [...assignments]
          .sort((a: any, b: any) => {
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
          })
          .forEach((a: any) => dayEvents.push({ type: 'assignment', data: a }));
      }
    }
    if (eventFilter === 'all' || eventFilter === 'events') {
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      events
        .filter((e: any) => e.date === dStr)
        .forEach((e: any) => dayEvents.push({ type: 'event', data: e }));
    }
    if (dayEvents.length === 0) {
      return null;
    }

    const calculateProgress = (evt: any): number => {
      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);

      if (d < todayZero) return 1.0;
      if (!isToday) return 0.0;

      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      if (evt.type === 'class') {
        const timeParts = evt.data.time.split('-');
        const startStr = timeParts[0].trim();
        const endStr = timeParts.length > 1 ? timeParts[1].trim() : startStr;

        const [sH, sM] = startStr
          .split(':')
          .map((x: string) => parseInt(x, 10) || 0);
        const [eH, eM] = endStr
          .split(':')
          .map((x: string) => parseInt(x, 10) || 0);

        const startMins = sH * 60 + sM;
        const endMins = eH * 60 + eM;

        if (nowMins <= startMins) return 0;
        if (nowMins >= endMins) return 1;
        return (nowMins - startMins) / (endMins - startMins || 1);
      }

      if (evt.type === 'exam') {
        const timeStr = evt.data.exam?.examTime;
        if (timeStr && timeStr.includes('-')) {
          const parts = timeStr.split('-');
          const [sH, sM] = parts[0]
            .trim()
            .split(':')
            .map((x: string) => parseInt(x, 10) || 0);
          const [eH, eM] = parts[1]
            .trim()
            .split(':')
            .map((x: string) => parseInt(x, 10) || 0);

          const startMins = sH * 60 + sM;
          const endMins = eH * 60 + eM;

          if (nowMins <= startMins) return 0;
          if (nowMins >= endMins) return 1;
          return (nowMins - startMins) / (endMins - startMins || 1);
        }
      }

      return evt.isDone ? 1.0 : 0.0;
    };

    const eventsWithStatus = dayEvents.map((evt) => {
      const progress = calculateProgress(evt);
      const isDone = progress >= 1.0;
      return { ...evt, progress, isDone };
    });

    const calendarEvents = eventsWithStatus.filter(
      (e) => e.type === 'calendar',
    );
    const otherEvents = eventsWithStatus.filter((e) => e.type !== 'calendar');
    const doneEvents = otherEvents.filter((e) => e.isDone);
    const upcomingEvents = otherEvents.filter((e) => !e.isDone);

    return (
      <div
        ref={isToday ? todayRef : undefined}
        className="@container mb-2 sm:mb-4 flex gap-1.5 sm:gap-3 relative select-none animate-home-item"
        style={{ animationDelay: `${Math.min(dIdx, 8) * 40}ms` }}
      >
        {' '}
        {/* Left Date Column */}
        <div className="flex flex-col items-center shrink-0 w-8 sm:w-12 pt-0.5 sm:pt-1 sticky top-4 h-fit z-10 select-none">
          <div
            className={`flex items-center justify-center font-black transition-all w-7 h-7 sm:w-10 sm:h-10 rounded-full text-xs sm:text-[clamp(0.85rem,3cqw,1.125rem)] ${
              isToday
                ? 'bg-(--accent-base) text-(--text-inverse)'
                : 'bg-transparent text-(--text-main)'
            }`}
          >
            {d.getDate()}
          </div>
          <div
            className={`text-[8px] sm:text-[9px] font-expanded font-bold uppercase mt-0.5 ${
              isToday ? 'text-(--accent-base)' : 'text-(--text-muted)'
            }`}
          >
            {d.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>

          {/* Instructional Day: Graduate Cap Icon below date on left */}
          {calEvent && calEvent.isInstructional && !calEvent.isHoliday && (
            <span
              title="Instructional Day"
              className="mt-1 flex items-center justify-center"
            >
              <School className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-(--accent-base) shrink-0" />
            </span>
          )}

          {/* Holiday: Red Dot below date on left */}
          {calEvent && calEvent.isHoliday && (
            <div
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 mt-1 shrink-0 shadow-xs"
              title="Holiday"
            />
          )}
        </div>
        {/* Right Content Area */}
        <div className="flex flex-col gap-px flex-1 min-w-0 pb-2 sm:pb-4 border-l-2 border-(--border-dim) pl-2 sm:pl-4">
          {/* Holiday text */}
          {calEvent?.isHoliday && (
            <div className="w-full text-left py-0.5 sm:py-1 text-xs md:text-sm font-bold text-(--text-main) tracking-wide select-none">
              {calEvent.info
                ? calEvent.info.replace(/^holiday\s*[:•\-]?\s*/i, '').trim()
                : 'No Classes'}
            </div>
          )}

          {/* Exam Day line */}
          {dayExams.length > 0 ? (
            <div className="w-full text-left py-0.5 sm:py-1 text-xs md:text-sm font-bold text-(--accent-base) tracking-wide select-none">
              {dayExams[0]?.groupType
                ? `${dayExams[0].groupType} Examination`
                : 'Examination Day'}
            </div>
          ) : (
            calEvent?.info &&
            /exam|cat\s*\d|fat|mid\s*term/i.test(calEvent.info) && (
              <div className="w-full text-left py-0.5 sm:py-1 text-xs md:text-sm font-bold text-(--accent-base) tracking-wide select-none">
                {calEvent.info.trim()}
              </div>
            )
          )}

          {(() => {
            const renderGroupedEvents = (
              eventList: any[],
              keyPrefix: string,
            ) => {
              const groups: Array<{ type: string; items: any[] }> = [];
              eventList.forEach((item) => {
                const lastGroup = groups[groups.length - 1];
                if (lastGroup && lastGroup.type === item.type) {
                  lastGroup.items.push(item);
                } else {
                  groups.push({ type: item.type, items: [item] });
                }
              });

              return groups.map((group, gIdx) => (
                <div
                  key={`${keyPrefix}-group-${gIdx}`}
                  className="flex flex-col gap-px rounded-xl sm:rounded-2xl overflow-hidden mb-1.5 sm:mb-2"
                >
                  {group.items.map((evt, i) => {
                    const radiusClass =
                      'rounded-xs sm:rounded-sm first:rounded-t-xl sm:first:rounded-t-2xl last:rounded-b-xl sm:last:rounded-b-2xl';
                    return (
                      <div
                        key={`${keyPrefix}-${gIdx}-${i}`}
                        className={
                          evt.isDone || keyPrefix.includes('done')
                            ? 'opacity-40 grayscale contrast-75 saturate-0'
                            : isToday
                              ? 'opacity-100'
                              : 'opacity-80'
                        }
                      >
                        {evt.type === 'class' ? (
                          <ScheduleRow
                            item={evt.data as UpcomingClass}
                            onClick={() => {
                              if ((evt.data as UpcomingClass)?.course?.code) {
                                useDataStore
                                  .getState()
                                  .setHighlightedCourseCode(
                                    (evt.data as UpcomingClass).course.code,
                                  );
                              }
                              onNavigate &&
                                onNavigate({
                                  title: 'Timetable',
                                  url: 'academics/common/StudentTimeTable',
                                  category: 'Academics',
                                });
                            }}
                            use24HourTime={use24HourTime}
                            progress={evt.progress}
                            className={radiusClass}
                          />
                        ) : evt.type === 'assignment' ? (
                          <AssignmentRow
                            assignment={evt.data as Assignment}
                            onClick={(e, selected) => {
                              e.stopPropagation();
                              if (onNavigate) {
                                openAssignmentInDA(selected, onNavigate);
                              }
                            }}
                            progress={evt.progress}
                            className={radiusClass}
                          />
                        ) : evt.type === 'exam' ? (
                          <ExamRow
                            exam={(evt.data as any).exam}
                            groupType={(evt.data as any).groupType}
                            showGroupPill={false}
                            onClick={() =>
                              onNavigate &&
                              onNavigate({
                                title: 'Exam Schedule',
                                url: 'examinations/StudExamSchedule',
                                category: 'Examinations',
                              })
                            }
                            use24HourTime={use24HourTime}
                            progress={evt.progress}
                            className={radiusClass}
                          />
                        ) : evt.type === 'calendar' ? (
                          evt.data.isHoliday ? (
                            <React.Fragment />
                          ) : (
                            <div
                              className={`w-full text-left p-3 flex flex-col ${radiusClass}`}
                              style={{
                                backgroundColor: calEventBg,
                                color: calEventFg,
                              }}
                            >
                              <span className="font-black font-expanded uppercase text-base md:text-lg">
                                {evt.data.info}
                              </span>
                              {evt.data.subInfo && (
                                <span className="text-xs font-bold mt-1 opacity-80">
                                  {evt.data.subInfo}
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          <EventRow
                            event={evt.data as Event}
                            progress={evt.progress}
                            className={radiusClass}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            };

            return (
              <>
                {isToday && doneEvents.length > 0 ? (
                  <div className="mb-1.5 sm:mb-2">
                    <button
                      type="button"
                      onClick={() => setShowCompleted((v) => !v)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-(--bg-highlight) border border-(--border-dim)/40 text-[10px] sm:text-xs font-black font-expanded uppercase tracking-wider text-(--text-muted) hover:text-(--text-main) transition-colors cursor-pointer"
                    >
                      <span>Completed · {doneEvents.length}</span>
                      <KeyboardArrowDown
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {showCompleted && (
                      <div className="mt-1.5 sm:mt-2">
                        {renderGroupedEvents(doneEvents, 'done')}
                      </div>
                    )}
                  </div>
                ) : (
                  renderGroupedEvents(doneEvents, 'done')
                )}

                {isToday && <div ref={nowRef} className="scroll-mt-[40vh]" />}

                {renderGroupedEvents(upcomingEvents, 'upcoming')}
              </>
            );
          })()}
        </div>
      </div>
    );
  },
);
