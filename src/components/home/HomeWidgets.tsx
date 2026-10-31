import React, { useMemo } from 'react';
import { School } from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

import { AppSettings } from '../../utils/settings-store';
import { Card } from '../ui/Card';
import { Assignment, CourseSummary } from '../../types/vtop';
import { AssignmentRow } from './HomeRows';
import { parseVtopDate } from '../../utils/formatting';
import { openAssignmentInDA } from '../../utils/daNavigation';

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
  const totalEarnedStr = stats.credits || '...';
  const totalEarnedNum = parseFloat(stats.credits);
  const nonGradedNum = parseFloat(stats.nonGraded || '');
  const isLoaded = !isNaN(totalEarnedNum) && !isNaN(nonGradedNum);

  const gradedStr = isLoaded
    ? (totalEarnedNum - nonGradedNum).toString().replace(/\.0$/, '')
    : '...';
  const nonGradedStr = isLoaded
    ? nonGradedNum.toString().replace(/\.0$/, '')
    : stats.nonGraded || '0';

  const pendingAssignments = useMemo(() => {
    return assignments
      .filter((a) => a.status !== 'submitted')
      .sort((a, b) => {
        const msA = a.dueDateMs ?? parseVtopDate(a.dueDate)?.getTime() ?? NaN;
        const msB = b.dueDateMs ?? parseVtopDate(b.dueDate)?.getTime() ?? NaN;
        if (isNaN(msA) && isNaN(msB)) return 0;
        if (isNaN(msA)) return 1;
        if (isNaN(msB)) return -1;
        return msA - msB;
      });
  }, [assignments]);

  const cgpaHoverTitle = `${gradedStr} + ${nonGradedStr} NGCR / ${stats.totalCredits || '...'} Credits${stats.placement ? ` • ${stats.placement}` : ''}`;

  // Mobile Merged CGPA & Credits Card Rendering (< lg)
  if (isMobileFeed) {
    return (
      <Card
        onClick={() =>
          onNavigate({
            title: 'Grades View',
            url: 'examinations/StudentGradeView',
            category: 'Examinations',
          })
        }
        className={`w-full bg-(--bg-highlight) rounded-3xl p-5 sm:p-6 min-h-[120px] flex flex-col justify-between relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) transition-all ${className || ''}`}
      >
        <div className="flex justify-between items-start my-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none">
                CGPA
              </span>
              <span
                onClick={(e) => e.stopPropagation()}
                title={cgpaHoverTitle}
                aria-label={cgpaHoverTitle}
                className="inline-flex items-center justify-center text-(--text-muted) hover:text-(--text-main) opacity-85 hover:opacity-100 transition-opacity cursor-help select-none text-sm font-black leading-none"
              >
                ?
              </span>
            </div>
            <div
              className={`text-3xl sm:text-4xl font-black font-expanded leading-none text-(--text-main) transition-all duration-fast ${
                settings.blurCgpa ? 'blur-md hover:blur-none' : ''
              }`}
            >
              {stats.cgpa || '--'}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none mb-2">
              Credits
            </span>
            <div className="text-2xl sm:text-3xl font-black font-expanded leading-none whitespace-nowrap text-(--text-main)">
              {totalEarnedStr}{' '}
              <span className="text-base sm:text-lg text-(--text-muted)">
                / {stats.totalCredits || '...'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Original Desktop Right Column View
  return (
    <div
      className={`hidden lg:flex w-full lg:w-[27%] xl:w-[24%] flex-col shrink-0 h-auto lg:h-full overflow-y-auto custom-scrollbar relative z-30 pt-20 md:pt-23 lg:pt-25 pb-4 md:pb-6 lg:pb-8 pl-2 lg:pl-3 pr-4 lg:pr-6 gap-4 ${className || ''}`}
    >
      <Card
        onClick={() =>
          onNavigate({
            title: 'Grades View',
            url: 'examinations/StudentGradeView',
            category: 'Examinations',
          })
        }
        className={`group shrink-0 h-auto bg-(--bg-highlight) rounded-4xl p-5 flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-(--border-main) shadow-(--brutal-shadow-sm) hover:shadow-(--brutal-shadow-hover) transition-all ${className || ''}`}
      >
        {/* Credits Row */}
        <div className="flex items-start justify-end relative z-10 mb-3">
          <div className="text-right flex flex-col items-end">
            <div className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none mb-1">
              Credits
            </div>
            <div className="text-3xl font-black font-expanded leading-none whitespace-nowrap">
              {totalEarnedStr}{' '}
              <span className="text-xl text-(--text-muted)">
                / {stats.totalCredits || '...'}
              </span>
            </div>
          </div>
        </div>

        {/* CGPA Row */}
        <div className="flex flex-col relative z-10">
          <div className="flex items-center justify-between">
            <div className="relative inline-flex items-center">
              <School className="w-10 h-10 text-(--text-main) mix-blend-overlay opacity-80" />
              <span
                onClick={(e) => e.stopPropagation()}
                title={cgpaHoverTitle}
                aria-label={cgpaHoverTitle}
                className="absolute -top-1 -right-2.5 inline-flex items-center justify-center text-(--text-muted) hover:text-(--text-main) opacity-85 hover:opacity-100 transition-opacity cursor-help select-none text-sm font-black leading-none"
              >
                ?
              </span>
            </div>
            <div className="text-right">
              <div className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) leading-none">
                CGPA
              </div>
              <div
                className={`text-3xl font-black font-expanded leading-none transition-all duration-fast ${
                  settings.blurCgpa ? 'blur-md hover:blur-none' : ''
                }`}
              >
                {stats.cgpa || '--'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-visible flex flex-col min-h-0 pb-2 mt-4 gap-4">
        <Card
          onClick={() =>
            onNavigate({
              title: 'Assignments',
              url: 'examinations/StudentDA',
              category: 'Examinations',
            })
          }
          className="shrink-0 bg-(--bg-highlight) rounded-4xl flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-transparent hover:border-(--border-main) transition-all h-fit"
        >
          <div className="px-5 pt-5 border-b-2 border-(--border-main) flex justify-between items-center shrink-0">
            <div className="flex flex-col">
              <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) mb-1 leading-none">
                Upcoming Assignments
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-0.5 rounded-2xl overflow-hidden">
            {pendingAssignments.length > 0 ? (
              pendingAssignments.map((assignment, idx) => (
                <AssignmentRow
                  key={idx}
                  assignment={assignment}
                  onClick={(e, selected) => {
                    e.stopPropagation();
                    openAssignmentInDA(selected, onNavigate);
                  }}
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
