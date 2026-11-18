import React, { useEffect } from 'react';
import {
  Home,
  CalendarMonth,
  Checklist,
  Assignment,
  Layers,
  QueryStats,
  Leaderboard,
  Event,
  MenuBook,
  Person,
  Menu,
  Close,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { ViewType } from '../../types/vtop';

/**
 * The shell's whole public surface: destinations, shared page title,
 * displayLarge role and content measure. Bars and pages are adapters over
 * these rules so no navigation or type rule is repeated per screen.
 */
export interface NavDestination {
  view: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_DESTINATIONS: readonly NavDestination[] = [
  { view: 'dashboard', label: 'Home', icon: Home },
  { view: 'timetable', label: 'Timetable', icon: CalendarMonth },
  { view: 'attendance', label: 'Attendance', icon: Checklist },
  { view: 'digitalAssignments', label: 'Assignments', icon: Assignment },
  { view: 'coursePage', label: 'Course Page', icon: Layers },
  { view: 'marks', label: 'Marks', icon: QueryStats },
  { view: 'grades', label: 'Grades', icon: Leaderboard },
  { view: 'calendar', label: 'Calendar', icon: Event },
  { view: 'curriculum', label: 'Curriculum', icon: MenuBook },
  { view: 'profile', label: 'Profile', icon: Person },
];

export const getPageTitle = (view: string, dynamicTitle?: string): string => {
  switch (view) {
    case 'dashboard':
      return 'Home';
    case 'timetable':
      return 'Timetable';
    case 'curriculum':
      return 'Curriculum';
    case 'marks':
      return 'Marks';
    case 'grades':
      return 'Grades & History';
    case 'profile':
      return 'Profile';
    case 'settings':
      return 'Settings';
    case 'coursePage':
      return 'Course Page';
    case 'digitalAssignments':
      return 'Assignments';
    case 'attendance':
      return 'Attendance';
    case 'examSchedule':
      return 'Exam Schedule';
    case 'calendar':
      return 'Calendar';
    case 'lateHour':
      return 'Late Hour';
    case 'content':
      return dynamicTitle || 'Legacy View';
    default:
      return '';
  }
};

/** Material 3 displayLarge role, expressed with the app's semantic tokens. */
export const DISPLAY_LARGE_CLASS =
  'text-[2rem] leading-[1.05] md:text-[2.75rem] font-normal tracking-tight text-(--text-main)';

/** Readable content measure; opted out by views that need the full width. */
export const CONTENT_WIDTH_CLASS = 'max-w-[1040px] w-full mx-auto';

export const isFullWidthView = (view: string): boolean => view === 'coursePage';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base)';

interface NavListProps {
  currentView: string;
  onSelect: (view: ViewType) => void;
  variant: 'rail' | 'drawer';
}

const NavList = ({ currentView, onSelect, variant }: NavListProps) => (
  <>
    {NAV_DESTINATIONS.map((destination) => {
      const Icon = destination.icon;
      const active = destination.view === currentView;
      const isDrawer = variant === 'drawer';
      return (
        <button
          key={destination.view}
          type="button"
          onClick={() => onSelect(destination.view)}
          aria-label={destination.label}
          aria-current={active ? 'page' : undefined}
          title={destination.label}
          className={`group flex shrink-0 cursor-pointer items-center rounded-2xl transition-colors hover:bg-(--bg-highlight) ${FOCUS_RING} ${
            isDrawer
              ? 'w-full min-h-12 flex-row gap-3 px-3 py-2.5 text-left'
              : 'w-16 min-h-14 flex-col justify-center gap-1 py-1.5'
          }`}
        >
          <span
            className={`flex items-center justify-center rounded-2xl transition-colors ${
              isDrawer ? 'w-10 h-10' : 'w-10 h-7'
            } ${
              active
                ? 'bg-(--accent-base) text-(--text-inverse)'
                : 'text-(--text-muted) group-hover:text-(--text-main)'
            }`}
          >
            <Icon className="w-5 h-5" />
          </span>
          <span
            className={`text-[10px] leading-tight font-bold truncate ${
              active ? 'text-(--accent-base)' : 'text-(--text-muted)'
            }`}
          >
            {destination.label}
          </span>
        </button>
      );
    })}
  </>
);

export interface NavigationShellProps {
  currentView: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
}

/** Persistent rail on wide windows, modal drawer on compact windows. */
export const NavigationShell = ({
  currentView,
  open,
  onClose,
  onNavigate,
}: NavigationShellProps) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const selectFromDrawer = (view: ViewType) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="hidden min-[600px]:flex fixed left-0 top-16 sm:top-18 md:top-20 bottom-0 z-40 w-20 flex-col items-center gap-1 overflow-y-auto custom-scrollbar bg-(--bg-surface) border-r border-(--border-dim) pt-3 pb-4"
      >
        <NavList
          currentView={currentView}
          onSelect={onNavigate}
          variant="rail"
        />
      </nav>

      {open && (
        <div className="min-[600px]:hidden fixed inset-0 z-10010 flex animate-fade-in-150">
          <div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-(--bg-main) opacity-80"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-(--border-dim) bg-(--bg-surface) shadow-2xl"
          >
            <div className="flex min-h-16 items-center justify-between border-b border-(--border-dim) px-4">
              <span className="font-expanded text-lg font-bold text-(--text-main)">
                retop
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation"
                className={`flex w-12 h-12 cursor-pointer items-center justify-center rounded-2xl text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main) ${FOCUS_RING}`}
              >
                <Close className="w-5 h-5" />
              </button>
            </div>
            <nav
              aria-label="Drawer navigation"
              className="flex flex-1 flex-col gap-1 overflow-y-auto custom-scrollbar p-2"
            >
              <NavList
                currentView={currentView}
                onSelect={selectFromDrawer}
                variant="drawer"
              />
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

/** Compact-only trigger; the bar stays a thin adapter over the shell. */
export const NavMenuButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open navigation"
    title="Open navigation"
    className={`flex w-12 h-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main) min-[600px]:hidden ${FOCUS_RING}`}
  >
    <Menu className="w-6 h-6" />
  </button>
);
