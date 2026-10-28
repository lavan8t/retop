import React, { useState, useEffect, useMemo, useRef } from 'react';

import {
  QuickLink,
  MenuCategory,
  CourseSummary,
  TimetableCourse,
  SpotlightCategoryGroup,
} from '../../types/vtop';
import { Card } from '../ui/Card';
import { AttendanceRow } from './HomeRows';
import { EmptyState } from '../EmptyState';
import { useDataStore } from '../../store/dataStore';
import { SpotlightSection } from './SpotlightSection';
import { isTypingEvent } from '../../utils/keyboard';

interface QuickLinksMenuProps {
  className?: string;
  menuCategories: MenuCategory[];
  onNavigate: (link: QuickLink) => void;
  pinnedLinks?: QuickLink[];
  handleTogglePin?: (link: QuickLink) => void;
  attendance: CourseSummary[];
  ttCourses: TimetableCourse[];
  spotlightCategories: SpotlightCategoryGroup[];
}

export const QuickLinksMenu: React.FC<QuickLinksMenuProps> = ({
  className,
  menuCategories,
  onNavigate,
  pinnedLinks = [],
  handleTogglePin,
  attendance,
  ttCourses,
  spotlightCategories,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    status,
    ttLoading,
    calLoadingGrid,
    calLoadingMonths,
    attRecordsLoading,
  } = useDataStore();
  const isLoading =
    status === 'Syncing...' ||
    status === 'Initializing...' ||
    ttLoading ||
    calLoadingGrid ||
    calLoadingMonths ||
    attRecordsLoading;

  // Recent Links State & Handler
  const [recentLinks, setRecentLinks] = useState<QuickLink[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('retop-recent-links') || '[]');
    } catch {
      return [];
    }
  });

  const handleNavigate = (link: QuickLink) => {
    setRecentLinks((prev) => {
      const filtered = prev.filter((l) => l.url !== link.url);
      const updated = [link, ...filtered].slice(0, 4); // Keep top 4
      localStorage.setItem('retop-recent-links', JSON.stringify(updated));
      return updated;
    });
    onNavigate(link);
  };

  const [activeMenu, setActiveMenu] = useState<{
    cat: MenuCategory;
    rect: DOMRect;
  } | null>(null);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isChildHoveredRef = useRef(false);

  const handleMenuEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleChildEnter = () => {
    handleMenuEnter();
    isChildHoveredRef.current = true;
  };

  const handleChildLeave = () => {
    isChildHoveredRef.current = false;
    closeTimeoutRef.current = setTimeout(() => {
      if (!isChildHoveredRef.current) {
        setActiveMenu(null);
      }
    }, 300);
  };

  const handleMenuLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      if (!isChildHoveredRef.current) {
        setActiveMenu(null);
      }
    }, 450);
  };

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.closest &&
        (target.closest('.custom-scrollbar') || target.closest('.popup-shadow'))
      )
        return;
      setActiveMenu(null);
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.closest &&
        (target.closest('#retop-search-dropdown') ||
          target.closest('.popup-shadow'))
      )
        return;
      setActiveMenu(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingEvent(e)) return;

      // If typing an alphanumeric character and not already focused on an input field
      if (
        e.key.length === 1 &&
        /[a-zA-Z0-9]/.test(e.key) &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        inputRef.current?.focus();
        // Intentionally do not preventDefault here so the character gets typed into the input
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const flattenedLinks = useMemo(() => {
    if (!query) return [];
    const lowerQ = query.toLowerCase();
    const links: QuickLink[] = [];
    menuCategories.forEach((cat) => links.push(...cat.links));

    const matches = links.filter(
      (l) =>
        l.title.toLowerCase().includes(lowerQ) ||
        (l.category && l.category.toLowerCase().includes(lowerQ)),
    );

    const grouped = new Map<string, QuickLink[]>();
    matches.forEach((link) => {
      const cat = link.category || 'Other';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(link);
    });

    const finalLinks: QuickLink[] = [];
    grouped.forEach((groupLinks) => finalLinks.push(...groupLinks));
    return finalLinks;
  }, [query, menuCategories]);

  const sortedAttendance = useMemo(() => {
    const activeCourses = attendance.filter((a) => {
      if (!ttCourses || ttCourses.length === 0) return true;
      return ttCourses.some((tc) => tc.code === a.code);
    });
    return activeCourses.sort((a, b) => {
      const valA = parseFloat(a.attendance) || 0;
      const valB = parseFloat(b.attendance) || 0;
      return valA - valB;
    });
  }, [attendance, ttCourses]);

  const overallAttendance = useMemo(() => {
    const valid = attendance.filter((a) => !isNaN(parseFloat(a.attendance)));
    if (valid.length === 0) return '--';
    const sum = valid.reduce((acc, a) => acc + parseFloat(a.attendance), 0);
    return Math.round(sum / valid.length) + '%';
  }, [attendance]);

  // Handle auto-scroll for keyboard nav
  useEffect(() => {
    if (query) {
      const el = document.getElementById(`home-search-item-${selectedIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    } else if (activeMenu) {
      const el = document.getElementById(`home-popup-item-${selectedIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, query, activeMenu]);

  useEffect(() => {
    if (!query && !activeMenu) return;
    const currentList = activeMenu ? activeMenu.cat.links : flattenedLinks;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((p) => (p + 1) % currentList.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (p) => (p - 1 + currentList.length) % currentList.length,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentList[selectedIndex]) {
          handleNavigate(currentList[selectedIndex]);
          setActiveMenu(null);
          setQuery('');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setActiveMenu(null);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, flattenedLinks, selectedIndex, activeMenu]); // Removed onNavigate since we use handleNavigate

  return (
    <>
      <div
        className={`w-full lg:w-[27%] xl:w-[24%] flex-col shrink-0 h-auto lg:h-full overflow-y-auto custom-scrollbar scrollbar-gutter-stable relative z-40 pt-20 md:pt-23 lg:pt-25 pb-4 md:pb-6 lg:pb-8 pl-4 lg:pl-6 pr-2 lg:pr-3 gap-4 ${className || 'hidden lg:flex'}`}
      >
        {/* Attendance Compact Box */}
        <div className="shrink-0 flex flex-col w-full">
          <Card
            onClick={() =>
              onNavigate({
                title: 'Class Attendance',
                url: 'studentattendance',
                category: 'Academics',
              })
            }
            className="group shrink-0 bg-(--bg-highlight) rounded-4xl flex flex-col relative z-30 cursor-pointer overflow-hidden border-2 border-transparent hover:border-(--border-main) transition-all h-fit"
          >
            <div className="px-5 pt-5 border-b-2 border-(--border-main) flex justify-between items-center shrink-0">
              <div className="flex flex-col">
                <span className="text-[0.625rem] font-expanded font-bold uppercase text-(--text-muted) mb-1 leading-none">
                  Attendance
                </span>
                <span className="text-3xl font-black font-expanded leading-none text-(--text-main)">
                  {overallAttendance}
                </span>
              </div>
            </div>

            <div className="p-3 flex flex-col gap-0.5">
              {sortedAttendance.length === 0 ? (
                <EmptyState msg="No Registered Courses" size="sm" />
              ) : (
                sortedAttendance.map((c, i) => (
                  <AttendanceRow key={i} course={c} />
                ))
              )}
            </div>
          </Card>
        </div>

        {spotlightCategories && spotlightCategories.length > 0 && (
          <div className="shrink-0 flex flex-col relative z-30 w-full mt-2">
            <SpotlightSection spotlightCategories={spotlightCategories} />
          </div>
        )}
      </div>

      {/* Floating Menu Portal - Minimal Material Brutalism */}
      {activeMenu &&
        (() => {
          const itemCount = activeMenu.cat.links.length;
          const cols = Math.max(1, Math.min(5, Math.ceil(itemCount / 10)));
          const colWidth = 200;
          const popupWidth = cols * colWidth;
          const targetLeft = activeMenu.rect.right
            ? activeMenu.rect.right + 12
            : 0;
          const maxLeft =
            typeof window !== 'undefined'
              ? window.innerWidth - popupWidth - 16
              : targetLeft;
          const leftPos = Math.min(targetLeft, maxLeft);

          const targetTop = activeMenu.rect.top ? activeMenu.rect.top : 0;
          const estimatedHeight = Math.ceil(itemCount / cols) * 38 + 24;
          const maxTop =
            typeof window !== 'undefined'
              ? window.innerHeight - estimatedHeight - 16
              : targetTop;
          const topPos = Math.max(16, Math.min(targetTop, maxTop));

          return (
            <div
              onMouseEnter={handleChildEnter}
              onMouseLeave={handleChildLeave}
              className="fixed z-999999 bg-(--bg-surface) border-0 rounded-2xl popup-shadow p-3 flex flex-col transition-all duration-200"
              style={{
                transformOrigin: 'left center',
                left: leftPos,
                top: topPos,
                width: `${popupWidth}px`,
                maxWidth: 'calc(100vw - 40px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="grid gap-1 pt-1"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {activeMenu.cat.links.map((link, i) => (
                  <button
                    key={i}
                    id={`home-popup-item-${i}`}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => {
                      handleNavigate(link);
                      setActiveMenu(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group ${
                      i === selectedIndex
                        ? 'bg-(--accent-base) text-(--text-inverse)'
                        : 'bg-transparent text-(--text-muted) hover:bg-(--bg-highlight) hover:text-(--text-main)'
                    }`}
                  >
                    <span className="flex-1 truncate">{link.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
    </>
  );
};
