import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useDeferredValue,
} from 'react';
import {
  Error,
  Search,
  Autorenew,
  ChevronRight,
  Home,
  Sync,
  Star,
  ArrowBack,
  Close,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { QuickLink, MenuCategory } from '../../types/vtop';
import { M3eIconButton } from '../attendance/m3eTags';
import { useDataStore } from '../../store/dataStore';
import { useAppStore } from '../../store/appStore';
import { getCategoryIcon } from '../../utils/icons';
import { toTitleCase } from '../../utils/formatting';
import {
  getDestinationView,
  hasRetopPage,
  isViewAvailableOnCampus,
} from '../../utils/routes';
import { currentCampus } from '../../utils/campus';
import { selectableRowProps } from '../ui/SelectableRow';

interface TopBarSearchProps {
  currentView: string;
  isOmniboxOpen: boolean;
  setIsOmniboxOpen: (val: boolean) => void;
  menuCategories: MenuCategory[];
  pinnedLinks: QuickLink[];
  onNavigate: (
    link: QuickLink,
    forceLegacy?: boolean,
    skipConfirm?: boolean,
  ) => void;
  onTogglePin: (link: QuickLink) => void;
  initialQuery?: string;
  pageTitle?: string;
  onBack?: () => void;
  status?: string;
  onSync?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: number;
}

const renderCategoryTitle = (catTitle: string) => {
  const titleStr = toTitleCase(catTitle);
  if (titleStr.toLowerCase().includes('retop')) {
    const parts = titleStr.split(/retop/i);
    return (
      <span>
        {parts[0]}
        <span
          className="font-logo retop-logo inline-block lowercase text-inherit"
          style={{
            fontFamily: 'var(--font-expanded)',
            fontVariationSettings:
              "'wdth' 125, 'wght' 900, 'ROND' 100, 'slnt' -10",
          }}
        >
          retop
        </span>
        {parts[1] || ''}
      </span>
    );
  }
  return titleStr;
};

export const RETOP_NATIVE_LINKS: QuickLink[] = [
  {
    title: 'Time Table',
    url: 'academics/common/StudentTimeTable',
    category: 'Made for retop',
  },
  {
    title: 'Class Attendance',
    url: 'academics/common/StudentAttendance',
    category: 'Made for retop',
  },
  {
    title: 'Assignments',
    url: 'examinations/StudentDA',
    category: 'Made for retop',
  },
  {
    title: 'Course Page Consolidated',
    url: 'academics/common/StudentCoursePage',
    category: 'Made for retop',
  },
  {
    title: 'Marks View',
    url: 'examinations/StudentMarkView',
    category: 'Made for retop',
  },
  {
    title: 'Grades View',
    url: 'examinations/StudentGradeView',
    category: 'Made for retop',
  },
  {
    title: 'Academic Calendar',
    url: 'academics/common/CalendarPreview',
    category: 'Made for retop',
  },
  {
    title: 'Student Profile',
    url: 'studentsRecord/StudentProfileAllView',
    category: 'Made for retop',
  },
  {
    title: 'Curriculum',
    url: 'academics/common/CurriculumSyllabus',
    category: 'Made for retop',
  },
  {
    title: 'Exam Schedule',
    url: 'examinations/StudExamSchedule',
    category: 'Made for retop',
  },
  {
    title: 'Late Hour Request',
    url: 'hostels/late/hour/student/request/1',
    category: 'Made for retop',
  },
  {
    title: 'Biometric Log',
    url: 'academics/biometriclogdisplay',
    category: 'Made for retop',
  },
  {
    title: 'Settings',
    url: '#settings',
    category: 'Made for retop',
  },
];

export const ITEM_ALIASES: Record<string, string[]> = {
  'time table': [
    'timetable',
    'time table',
    'schedule',
    'class schedule',
    'slots',
    'weekly timetable',
  ],
  'class attendance': [
    'attendance',
    'class attendance',
    'attendance view',
    'my attendance',
  ],
  assignments: [
    'digital assignments',
    'digital assignment',
    'da',
    'da upload',
    'assignment',
    'assignments',
    'digital assignment upload',
  ],
  'marks view': [
    'marks',
    'marks view',
    'cat marks',
    'assessment marks',
    'test marks',
    'exam marks',
  ],
  'grades view': [
    'grades',
    'grades view',
    'grade history',
    'cgpa',
    'gpa',
    'history',
    'gpa calculator',
    'grade calculator',
  ],
  'academic calendar': [
    'academic calendar',
    'calendar',
    'events',
    'academics calendar',
    'calendar preview',
  ],
  'student profile': [
    'profile',
    'student profile',
    'digital id',
    'id card',
    'my profile',
  ],
  curriculum: [
    'curriculum',
    'syllabus',
    'curriculum syllabus',
    'course syllabus',
  ],
  'exam schedule': [
    'exam schedule',
    'exams',
    'fat',
    'cat',
    'exam',
    'fat schedule',
    'cat schedule',
    'exam timetable',
  ],
  'course page consolidated': [
    'course page',
    'course page consolidated',
    'consolidated course page',
    'course',
    'courses',
    'course material',
    'materials',
    'class material',
    'subject material',
    'course page (consolidated)',
  ],
  settings: ['settings', 'preferences', 'theme', 'appearance'],
};

export const TopBarSearch: React.FC<TopBarSearchProps> = ({
  currentView,
  isOmniboxOpen,
  setIsOmniboxOpen,
  menuCategories,
  pinnedLinks,
  onNavigate,
  onTogglePin,
  initialQuery = '',
  pageTitle = 'Search',
  onBack,
  status,
  onSync,
  isSyncing = false,
  lastSyncTime = 0,
}) => {
  const { isModernUI, setIsModernUI } = useAppStore();
  const isOffline =
    typeof window !== 'undefined' &&
    (!!(window as any).__RETOP_OFFLINE__ ||
      window.location.pathname.includes('offline') ||
      window.location.hostname.includes('web.app') ||
      window.location.protocol === 'file:');
  const isHome =
    currentView === 'dashboard' || currentView === 'home' || !currentView;
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const formFieldRef = useRef<HTMLElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showLogoMenu, setShowLogoMenu] = useState(false);
  const logoMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeMenu, setActiveMenu] = useState<{
    cat: MenuCategory;
    rect: DOMRect;
  } | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (logoMenuTimeout.current) clearTimeout(logoMenuTimeout.current);
    };
  }, []);

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

  const isExpanded = isOmniboxOpen;

  // M3E owns the field's shadow DOM; force a pill shape on all four corners.
  useEffect(() => {
    const host = formFieldRef.current as any;
    if (!host) return;
    let style: HTMLStyleElement | null = null;
    let tries = 0;
    const attach = () => {
      const sr = host.shadowRoot;
      if (!sr) {
        if (tries++ < 20) requestAnimationFrame(attach);
        return;
      }
      if (style) return;
      style = document.createElement('style');
      style.textContent = `.outline{display:none!important}.base{border:1px solid var(--md-sys-color-outline,var(--border-dim))!important;border-radius:999px!important}.base:focus-within{border-color:var(--md-sys-color-primary,var(--accent-base))!important}`;
      sr.appendChild(style);
    };
    attach();
    return () => style?.remove();
  }, []);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        if (mobileInputRef.current) mobileInputRef.current.focus();
        else if (inputRef.current) inputRef.current.focus();
      }, 50);
    } else {
      setQuery('');
      setActiveMenu(null);
    }
  }, [isExpanded]);

  // STRICT HIERARCHY RULE ENFORCEMENT:
  // 1 = Search Bar (isExpanded)
  // 2 = Categories Menu (isExpanded && !query)
  // 3 = Right List of Pages Submenu (activeMenu)
  // Rule 1: If 1 is closed, 2 & 3 can NEVER be open.
  // Rule 2: If 2 is closed (!isExpanded || query), 3 can NEVER be open (3 is NEVER a zombie).
  useEffect(() => {
    if (!isExpanded || query.trim() !== '') {
      if (activeMenu !== null) {
        setActiveMenu(null);
      }
    }
  }, [isExpanded, query, activeMenu]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setIsOmniboxOpen(true);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (query) {
      setActiveMenu(null);
    }
  }, [query]);

  useEffect(() => {
    const handleOmniboxType = (e: any) => {
      setQuery((q) => (q + (e.detail || '')).replace(/[^a-zA-Z\s]/g, ''));
      setSelectedIndex(0);
      if (inputRef.current) inputRef.current.focus();
    };
    window.addEventListener('vtop-omnibox-type', handleOmniboxType);
    return () =>
      window.removeEventListener('vtop-omnibox-type', handleOmniboxType);
  }, []);

  const allCategories = useMemo(() => {
    const madeForRetopCat: MenuCategory = {
      id: 'made-for-retop',
      title: 'Made for retop',
      links: RETOP_NATIVE_LINKS,
    };

    if (isOffline) {
      return [madeForRetopCat];
    }

    const otherCats = menuCategories
      .filter((c) => c.title !== 'Made for retop')
      .filter((c) => c.links && c.links.length > 0);

    return [madeForRetopCat, ...otherCats];
  }, [menuCategories, isOffline]);

  const flattenedLinks = useMemo(() => {
    const campus = currentCampus();
    const allLinks = allCategories
      .flatMap((c) => c.links)
      .filter((link) =>
        isViewAvailableOnCampus(getDestinationView(link), campus),
      );
    const lowerQ = deferredQuery.toLowerCase().trim();

    if (!lowerQ) {
      const seen = new Set<string>();
      const retopLinks: QuickLink[] = [];
      const otherLinks: QuickLink[] = [];

      for (const link of allLinks) {
        const key = `${link.title.toLowerCase()}:${link.url.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          if (hasRetopPage(link)) retopLinks.push(link);
          else otherLinks.push(link);
        }
      }
      return [...retopLinks, ...otherLinks];
    }

    const scored: { link: QuickLink; score: number }[] = [];
    const seen = new Set<string>();

    for (const link of allLinks) {
      const key = `${link.title.toLowerCase().trim()}:${link.url.toLowerCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const titleLower = link.title.toLowerCase().trim();
      const urlLower = link.url.toLowerCase().trim();
      const aliases = ITEM_ALIASES[titleLower] || [];

      let score = 0;
      if (titleLower === lowerQ || aliases.includes(lowerQ)) score = 100;
      else if (
        titleLower.startsWith(lowerQ) ||
        aliases.some((a) => a.startsWith(lowerQ))
      )
        score = 85;
      else if (
        titleLower.includes(lowerQ) ||
        aliases.some((a) => a.includes(lowerQ)) ||
        urlLower.includes(lowerQ)
      )
        score = 65;

      if (score > 0) {
        if (hasRetopPage(link)) score += 10;
        scored.push({ link, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .map((s) => s.link)
      .slice(0, 15);
  }, [deferredQuery, allCategories]);

  const searchRetopLinks = useMemo(() => {
    const seen = new Set<string>();
    return flattenedLinks.filter((link) => {
      if (!hasRetopPage(link)) return false;
      const view = getDestinationView(link);
      if (seen.has(view)) return false;
      seen.add(view);
      return true;
    });
  }, [flattenedLinks]);
  const searchVtopGroups = useMemo(() => {
    const retopViews = new Set(searchRetopLinks.map(getDestinationView));
    const groups = new Map<string, QuickLink[]>();
    flattenedLinks
      .filter((link) => !hasRetopPage(link))
      .filter((link) => !retopViews.has(getDestinationView(link)))
      .forEach((link) => {
        const key = link.category || 'Other';
        const existing = groups.get(key) || [];
        if (!existing.some((item) => item.title === link.title)) {
          groups.set(key, [...existing, link]);
        }
      });
    return Array.from(groups.entries());
  }, [flattenedLinks, searchRetopLinks]);

  // Single ordered list so arrow keys / Enter match what is rendered.
  const searchResults = useMemo(
    () => [
      ...searchRetopLinks,
      ...searchVtopGroups.flatMap(([, links]) => links),
    ],
    [searchRetopLinks, searchVtopGroups],
  );

  useEffect(() => {
    if (!isExpanded) return;
    dropdownRef.current
      ?.querySelector<HTMLElement>(`[data-search-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isExpanded, searchResults]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (searchResults.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOmniboxOpen(false);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + searchResults.length) % searchResults.length,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selLink = searchResults[selectedIndex];
        const isVtopOnly = !hasRetopPage(selLink);
        onNavigate(selLink, e.shiftKey || isVtopOnly, e.shiftKey || isVtopOnly);
        setIsOmniboxOpen(false);
        setQuery('');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOmniboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    query,
    flattenedLinks,
    selectedIndex,
    categoryIndex,
    allCategories,
    isExpanded,
    onNavigate,
    setIsOmniboxOpen,
    activeMenu,
    isModernUI,
  ]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (!isExpanded) return;
    if (query.trim()) {
      const el = document.getElementById(`search-result-item-${selectedIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (activeMenu) {
      const el = document.getElementById(`home-popup-item-${selectedIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      const el = document.getElementById(`topbar-cat-item-${categoryIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isExpanded, query, activeMenu, selectedIndex, categoryIndex]);

  const isSearchActive = isExpanded;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isMobileSearchClosing, setIsMobileSearchClosing] = useState(false);

  const closeMobileSearch = () => {
    setIsMobileSearchClosing(true);
    setTimeout(() => {
      setIsOmniboxOpen(false);
      setIsMobileSearchClosing(false);
      setQuery('');
    }, 150);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath
        ? event.composedPath()
        : [event.target as Node];
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        !path.includes(wrapperRef.current)
      ) {
        setIsOmniboxOpen(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isExpanded, setIsOmniboxOpen]);

  return (
    <div ref={wrapperRef} className="relative flex h-full flex-col z-50">
      {/* Material 3 text field */}
      <div className="px-3 pt-3 pb-1">
        <m3e-form-field
          ref={formFieldRef as any}
          className="w-full"
          style={
            {
              '--m3e-form-field-container-shape': '999px',
              '--m3e-outlined-form-field-container-shape': '999px',
            } as React.CSSProperties
          }
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search"
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, '');
              if (sanitized.toLowerCase() === 'demo') {
                useDataStore.getState().enableDemoMode();
                setQuery('');
                setIsOmniboxOpen(false);
                return;
              }
              setQuery(sanitized);
              setSelectedIndex(0);
              if (!isExpanded) setIsOmniboxOpen(true);
            }}
            onFocus={() => setIsOmniboxOpen(true)}
          />
          {query.trim() && (
            <M3eIconButton
              slot="suffix"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
            >
              <Close />
            </M3eIconButton>
          )}
        </m3e-form-field>
      </div>

      {/* Mobile Full-Screen Overlay (< lg): 150ms slide up/down animation */}
      {isSearchActive && (
        <div
          className={`fixed inset-0 z-999999 bg-(--bg-main) flex flex-col p-0 lg:hidden overflow-hidden w-screen h-screen ${
            isMobileSearchClosing ? 'animate-sheet-down' : 'animate-sheet-up'
          }`}
        >
          {/* Mobile Overlay Header: matches compact main topbar dimensions (h-14 px-2.5) */}
          <div className="h-14 px-2.5 sm:px-4 flex items-center gap-2 border-b border-(--border-dim) shrink-0 bg-(--bg-main)">
            <button
              onClick={closeMobileSearch}
              className="relative flex items-center justify-center shrink-0 cursor-pointer hover:opacity-75 transition-opacity focus:outline-none pr-1"
              aria-label="Close search"
            >
              <div className="flex items-end pb-1 pr-1 pl-1">
                <span className="font-expanded font-medium text-2xl italic lowercase leading-none text-(--text-main) hover:text-(--accent-hover) transition-colors">
                  re
                </span>
                <div className="relative ml-[-1px] mb-0.5 flex items-center justify-center transition-all duration-300 origin-bottom-left w-2.5 h-2.5 bg-(--accent-base) rounded-full">
                  <Search
                    className="w-1.5 h-1.5 text-(--text-inverse) transition-opacity absolute opacity-100"
                    strokeWidth={4}
                  />
                </div>
              </div>
            </button>
            <div className="flex-1 relative flex items-center bg-(--md-sys-color-surface-container-high) rounded-full px-5 py-3 border-2 border-(--md-sys-color-outline-variant)/50 focus-within:border-(--accent-base)">
              <input
                ref={mobileInputRef}
                type="text"
                placeholder={toTitleCase(pageTitle)}
                value={query}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  if (sanitized.toLowerCase() === 'demo') {
                    useDataStore.getState().enableDemoMode();
                    setQuery('');
                    setIsOmniboxOpen(false);
                    return;
                  }
                  setQuery(sanitized);
                  setSelectedIndex(0);
                }}
                className="w-full bg-transparent text-base font-medium text-(--text-main) focus:outline-none placeholder:text-(--text-muted)"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full hover:bg-(--bg-highlight) text-(--text-muted) hover:text-(--text-main) shrink-0 cursor-pointer"
                >
                  <Close className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Overlay Content */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-3 search-scrollbar">
            {!query.trim() ? (
              <>
                {/* Starred Items / Quick Links */}
                {pinnedLinks.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    {pinnedLinks.map((link, idx) => (
                      <div
                        key={idx}
                        {...selectableRowProps({
                          onActivate: () => {
                            onNavigate(link, false);
                            setIsOmniboxOpen(false);
                            setQuery('');
                          },
                          label: `Open ${toTitleCase(link.title)}`,
                          className:
                            'flex items-center justify-between px-4 py-3 rounded-full bg-(--bg-surface) border border-(--border-dim)/40 active:scale-[0.98] transition-all text-left',
                        })}
                        role="button"
                        onClick={(e) => {
                          const forceLegacy = e.shiftKey
                            ? isModernUI
                            : !isModernUI;
                          onNavigate(link, forceLegacy);
                          setIsOmniboxOpen(false);
                          setQuery('');
                        }}
                      >
                        <span className="text-xs font-medium text-(--text-main) truncate pr-1">
                          {toTitleCase(link.title)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Unpin ${toTitleCase(link.title)}`}
                          aria-pressed={true}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(link);
                          }}
                          className="min-w-12 min-h-12 flex items-center justify-center text-(--accent-base) hover:text-(--text-muted) shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) rounded-full"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Categories & Links (No section titles, no category bg cards, gap-1, fully rounded items with increased py) */}
                <div className="flex flex-col gap-1">
                  {allCategories.map((cat, catIdx) => {
                    const CatIcon = getCategoryIcon(cat.title);
                    return (
                      <div key={catIdx} className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 opacity-70">
                          <CatIcon className="w-3.5 h-3.5 text-(--accent-base)" />
                          <span className="font-expanded font-medium text-[11px] text-(--text-muted)">
                            {renderCategoryTitle(cat.title)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {cat.links.map((link, lIdx) => {
                            const linkDest = getDestinationView(link);
                            const isPinned = pinnedLinks.some(
                              (p) =>
                                p.url === link.url ||
                                (linkDest !== 'content' &&
                                  getDestinationView(p) === linkDest),
                            );
                            return (
                              <div
                                key={lIdx}
                                className="flex items-center justify-between px-4 py-3 rounded-full bg-(--bg-surface) hover:bg-(--bg-highlight) active:bg-(--bg-highlight) border border-(--border-dim)/30 transition-colors group/mitem"
                              >
                                <button
                                  onClick={(e) => {
                                    const forceLegacy = e.shiftKey
                                      ? isModernUI
                                      : !isModernUI;
                                    onNavigate(link, forceLegacy);
                                    setIsOmniboxOpen(false);
                                    setQuery('');
                                  }}
                                  className="flex items-center gap-2 flex-1 min-w-0 text-left text-xs font-medium text-(--text-main) cursor-pointer border-0 bg-transparent"
                                >
                                  <span className="truncate flex-1 pr-1">
                                    {toTitleCase(link.title)}
                                  </span>
                                  {hasRetopPage(link) && (
                                    <span
                                      className="re-badge inline-block text-[9px] font-medium px-1 py-0.5 rounded leading-none shrink-0 bg-transparent text-(--accent-base)"
                                      style={{
                                        fontFamily: 'var(--font-expanded)',
                                        fontVariationSettings:
                                          "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                                      }}
                                    >
                                      re.
                                    </span>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePin(link);
                                  }}
                                  className="min-w-12 min-h-12 flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) text-(--text-muted) hover:text-(--accent-base) shrink-0 cursor-pointer"
                                  title={
                                    isPinned ? 'Unpin from Dock' : 'Pin to Dock'
                                  }
                                  aria-label={
                                    isPinned ? 'Unpin from Dock' : 'Pin to Dock'
                                  }
                                  aria-pressed={isPinned}
                                >
                                  <Star
                                    className={`w-4 h-4 transition-all ${
                                      isPinned
                                        ? 'text-(--accent-base) fill-current'
                                        : 'opacity-50 hover:opacity-100'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Mobile Search Results */
              <div className="flex flex-col gap-1">
                {flattenedLinks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-(--text-dim) space-y-2">
                    <Error className="w-10 h-10 opacity-50 text-(--accent-base)" />
                    <span className="font-expanded text-sm font-medium text-(--text-muted)">
                      No Matches
                    </span>
                  </div>
                ) : (
                  flattenedLinks.map((link, i) => {
                    const linkDest = getDestinationView(link);
                    const isPinned = pinnedLinks.some(
                      (p) =>
                        p.url === link.url ||
                        (linkDest !== 'content' &&
                          getDestinationView(p) === linkDest),
                    );
                    return (
                      <div
                        key={i}
                        {...selectableRowProps({
                          onActivate: () => {
                            onNavigate(link, false);
                            setIsOmniboxOpen(false);
                            setQuery('');
                          },
                          label: `Open ${toTitleCase(link.title)}`,
                          className:
                            'flex items-center justify-between px-4 py-3.5 rounded-full bg-(--bg-surface) border border-(--border-dim)/40 active:scale-[0.99] transition-all',
                        })}
                        role="button"
                        onClick={(e) => {
                          const forceLegacy = e.shiftKey
                            ? isModernUI
                            : !isModernUI;
                          onNavigate(link, forceLegacy);
                          setIsOmniboxOpen(false);
                          setQuery('');
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span className="text-xs font-medium text-(--text-main) truncate">
                            {toTitleCase(link.title)}
                          </span>
                          {hasRetopPage(link) && (
                            <span
                              className="re-badge inline-block text-[9px] font-medium px-1 py-0.5 rounded leading-none shrink-0 bg-transparent text-(--accent-base)"
                              style={{
                                fontFamily: 'var(--font-expanded)',
                                fontVariationSettings:
                                  "'wdth' 151, 'wght' 700, 'ROND' 100, 'slnt' -10",
                              }}
                            >
                              re.
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(link);
                          }}
                          className="min-w-12 min-h-12 flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) text-(--text-muted) hover:text-(--accent-base) shrink-0 cursor-pointer"
                          title={isPinned ? 'Unpin from Dock' : 'Pin to Dock'}
                          aria-label={
                            isPinned ? 'Unpin from Dock' : 'Pin to Dock'
                          }
                          aria-pressed={isPinned}
                        >
                          <Star
                            className={`w-4 h-4 transition-all ${
                              isPinned
                                ? 'text-(--accent-base) fill-current'
                                : 'opacity-50 hover:opacity-100'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Search Dropdown (lg:flex) */}
      {isSearchActive && (
        <div
          ref={dropdownRef}
          key="search-dropdown"
          className="hidden lg:flex relative mt-1 min-h-0 w-full flex-1 flex-col overflow-hidden bg-transparent px-2 pb-3"
        >
          <div
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto search-scrollbar px-1.5 py-1.5"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)',
            }}
          >
            {flattenedLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-(--text-dim)">
                <Error className="w-8 h-8 mb-2 opacity-50" />
                <span className="font-expanded text-sm font-medium text-(--text-muted)">
                  No Matches
                </span>
              </div>
            ) : (
              <>
                {searchRetopLinks.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {searchRetopLinks.map((link) => {
                      const CatIcon = getCategoryIcon(link.title, link.url);
                      const idx = searchResults.indexOf(link);
                      const active = idx === selectedIndex;
                      return (
                        <button
                          key={`retop-${link.url}`}
                          data-search-index={idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onNavigate(link, false);
                            setIsOmniboxOpen(false);
                            setQuery('');
                          }}
                          className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-colors cursor-pointer border-0 ${
                            active
                              ? 'bg-(--accent-base) text-(--text-inverse)'
                              : 'bg-transparent text-(--text-main) hover:bg-(--bg-highlight)'
                          }`}
                        >
                          <CatIcon
                            className={`w-4 h-4 shrink-0 ${active ? 'text-(--text-inverse)' : 'text-(--accent-base)'}`}
                          />
                          <span className="truncate text-xs font-medium">
                            {toTitleCase(link.title)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchVtopGroups.map(([category, links]) => {
                  const open = query.trim() !== '' || openCats.has(category);
                  const CatIcon = getCategoryIcon(category);
                  return (
                    <div
                      key={category}
                      className="flex flex-col gap-0.5 mt-[2px]"
                    >
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setOpenCats((prev) => {
                            const next = new Set(prev);
                            if (next.has(category)) next.delete(category);
                            else next.add(category);
                            return next;
                          })
                        }
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:text-(--accent-base) cursor-pointer border-0 bg-transparent"
                      >
                        <span className="text-xs font-medium text-(--text-main)">
                          {renderCategoryTitle(category)}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-(--text-muted) transition-transform ${open ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {open &&
                        links.map((link) => {
                          const idx = searchResults.indexOf(link);
                          const active = idx === selectedIndex;
                          const ItemIcon = getCategoryIcon(
                            link.title,
                            link.url,
                          );
                          return (
                            <button
                              key={`vtop-${link.url}`}
                              data-search-index={idx}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                onNavigate(link, true, true);
                                setIsOmniboxOpen(false);
                                setQuery('');
                              }}
                              className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-colors cursor-pointer border-0 ${
                                active
                                  ? 'bg-(--accent-base) text-(--text-inverse)'
                                  : 'bg-transparent text-(--text-main) hover:bg-(--bg-highlight)'
                              }`}
                            >
                              <ItemIcon
                                className={`w-4 h-4 shrink-0 ${active ? 'text-(--text-inverse)' : 'text-(--text-main)'}`}
                              />
                              <span className="truncate text-xs font-medium">
                                {toTitleCase(link.title)}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
          <div className="w-full shrink-0 px-3 py-2 text-center text-[10px] font-medium text-(--text-muted) bg-transparent">
            {isOffline ? (
              <span>
                <span className="font-mono font-medium text-(--accent-base)">
                  Enter
                </span>{' '}
                to open &nbsp;•&nbsp;{' '}
                <span className="font-mono font-medium text-(--text-muted)">
                  Esc
                </span>{' '}
                to close
              </span>
            ) : (
              <span>
                <span className="font-mono font-medium text-(--accent-base)">
                  Shift + Enter
                </span>{' '}
                for{' '}
                {isModernUI ? (
                  <span className="font-vtop font-medium">VTOP</span>
                ) : (
                  'retop'
                )}{' '}
                &nbsp;•&nbsp;{' '}
                <span className="font-mono font-medium text-(--text-muted)">
                  Enter
                </span>{' '}
                for{' '}
                {isModernUI ? (
                  'retop'
                ) : (
                  <span className="font-vtop font-medium">VTOP</span>
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
