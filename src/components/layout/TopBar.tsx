import React from 'react';
import {
  GridView,
  List,
  CalendarMonth,
  MoreVert,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import { QuickLink } from '../../types/vtop';
import { M3eIcon } from '../attendance/m3eTags';
import { MaterialSwitch } from '../MaterialSwitch';
import { SemesterDropdown, ClassGroupDropdown } from '../ui/Dropdown';
import { getPageTitle } from './appShell';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useDataStore } from '../../store/dataStore';
import { useAppStore } from '../../store/appStore';
import { isTypingEvent } from '../../utils/keyboard';
import { formatSyncAge } from '../../utils/formatting';

interface TopBarProps {
  currentView: string;
  contentTitle: string;
  handleLinkClick: (link: QuickLink) => void;
  setCurrentView: (view: any) => void;
  pinnedLinks: QuickLink[];
  onTimetableSemChange?: (semId: string) => void;
  network?: any;
  onProfileClick?: () => void;
  showProfileMenu?: boolean;
  onSync?: () => void;
}

/**
 * Slim context bar: a page title plus the per-view controls the pages need.
 * Global search, favourites, sync and profile now live in AppNavRail.
 */
export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  contentTitle,
  handleLinkClick,
  setCurrentView,
  pinnedLinks,
  onTimetableSemChange,
  network,
  onProfileClick,
  showProfileMenu,
  onSync,
}) => {
  const [isMobileControlsOpen, setIsMobileControlsOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMobileControlsOpen(false);
  }, [currentView]);

  const {
    ttViewMode,
    setTtViewMode,
    calViewMode,
    setCalViewMode,
    cpSelectedCourseId,
    setCpSelectedCourseId,
    cpOptions,
    setCpOptions,
    cpSearchTerm,
    setCpSearchTerm,
    marksSemesters,
    marksSelectedSem,
    setMarksSelectedSem,
    marksSearchQuery,
    setMarksSearchQuery,
    isMarksModernView,
    setIsMarksModernView,
    gradesSemesters,
    gradesSelectedSem,
    setGradesSelectedSem,
    curriculumHideCompleted,
    setCurriculumHideCompleted,
  } = useAppStore();
  const {
    attSelectedSem,
    setAttSelectedSem,
    calGridData,
    status,
    calLoadingGrid,
    calLoadingMonths,
    attRecordsLoading,
    ttCourses,
    ttLoading,
    ttSemesters,
    ttSelectedSem,
    cpSelectedSem,
    setCpSelectedSem,
    cpSemesters,
    calSemesters,
    calSelectedSem,
    setCalSelectedSem,
    calClassGroups,
    calSelectedGroup,
    setCalSelectedGroup,
    daSemesters,
    daSelectedSem,
    setDaSelectedSem,
    fetchDACourses,
    pageSyncTimes,
    isSyncing,
    examSemesters,
    examSelectedSem,
    setExamSelectedSem,
    fetchExamSchedule,
    user,
  } = useDataStore();

  const [syncLabel, setSyncLabel] = React.useState(() =>
    formatSyncAge(pageSyncTimes[currentView]),
  );

  React.useEffect(() => {
    setSyncLabel(formatSyncAge(pageSyncTimes[currentView]));
  }, [currentView, pageSyncTimes]);

  const profileImg = user?.profileImgBase64;
  const profileInitials =
    (user?.name || user?.regNo || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';

  const handleCoursePageSemChange = (sem: string) => {
    setCpSelectedSem(sem);
    setCpSelectedCourseId('');
    // Force useCoursePage to refetch options for the new semester.
    setCpOptions([]);
  };

  const isLoading =
    status === 'Syncing...' ||
    status === 'Initializing...' ||
    isSyncing ||
    ttLoading ||
    calLoadingGrid ||
    calLoadingMonths ||
    attRecordsLoading;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in any input field or form control (shadow-DOM-aware)
      if (isTypingEvent(e)) {
        return;
      }

      // Hotkey 0 for Home/Dashboard, 1-9 for Pinned Pages
      if (e.key === '0') {
        e.preventDefault();
        setCurrentView('dashboard');
        return;
      }
      const num = parseInt(e.key);
      if (!isNaN(num) && num > 0 && num <= Math.min(pinnedLinks.length, 9)) {
        e.preventDefault();
        handleLinkClick(pinnedLinks[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, pinnedLinks, handleLinkClick, setCurrentView]);

  return (
    <header
      aria-busy={isLoading}
      className="shrink-0 h-14 bg-(--bg-main) border-b border-(--border-dim) px-3 sm:px-4 flex items-center justify-between gap-3 pointer-events-auto"
    >
      <h1 className="text-sm sm:text-base font-expanded font-bold text-(--text-main) truncate min-w-0">
        {getPageTitle(currentView, contentTitle) || 'retop'}
      </h1>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Global controls pinned top-right */}
        <div className="flex items-center gap-1.5">
          <m3e-icon-button
            id="topbar-reload"
            aria-label="Reload current page"
            aria-busy={isSyncing}
            disabled={isSyncing}
            onClick={onSync}
            onMouseEnter={() =>
              setSyncLabel(
                formatSyncAge(
                  useDataStore.getState().pageSyncTimes[currentView],
                ),
              )
            }
          >
            <M3eIcon name="refresh" variant="rounded" />
          </m3e-icon-button>
          <m3e-tooltip for="topbar-reload">{syncLabel}</m3e-tooltip>
          <button
            type="button"
            aria-label="Toggle profile menu"
            aria-expanded={showProfileMenu}
            onClick={onProfileClick}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-highlight) focus-visible:ring-2 focus-visible:ring-(--accent-base) outline-none cursor-pointer"
          >
            {profileImg ? (
              <img
                src={profileImg}
                alt=""
                className="w-8 h-8 rounded-full bg-white px-0.5 object-contain"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-(--bg-highlight) flex items-center justify-center text-xs font-medium text-(--accent-base)">
                {profileInitials}
              </span>
            )}
          </button>
        </div>

        {/* Desktop inline page controls (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-2 md:gap-4 h-full pointer-events-auto">
          {currentView === 'timetable' && (
            <div
              key="timetable-controls"
              className="flex items-center gap-1.5 md:gap-3 lg:gap-4 pr-0 pointer-events-auto"
            >
              <SemesterDropdown
                semesters={ttSemesters}
                selectedId={ttSelectedSem}
                onChange={(id: string) => onTimetableSemChange?.(id)}
              />

              <div className="hidden sm:flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                <SegmentedControl
                  options={[
                    {
                      label: (
                        <div
                          className="flex items-center justify-center"
                          title="Grid View"
                        >
                          <GridView className="w-3.5 h-3.5" />
                        </div>
                      ),
                      value: 'grid',
                    },
                    {
                      label: (
                        <div
                          className="flex items-center justify-center"
                          title="List View"
                        >
                          <List className="w-3.5 h-3.5" />
                        </div>
                      ),
                      value: 'list',
                    },
                    {
                      label: (
                        <div
                          className="flex items-center justify-center"
                          title="Week View"
                        >
                          <CalendarMonth className="w-3.5 h-3.5" />
                        </div>
                      ),
                      value: 'week',
                    },
                  ]}
                  value={ttViewMode}
                  onChange={(val) => setTtViewMode(val as any)}
                />
              </div>
            </div>
          )}

          {currentView === 'calendar' && (
            <div
              key="calendar-controls"
              className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
            >
              <SemesterDropdown
                semesters={calSemesters}
                selectedId={calSelectedSem}
                onChange={(id: string) => {
                  setCalSelectedSem(id);
                }}
              />
              {calClassGroups.length > 0 && (
                <ClassGroupDropdown
                  groups={calClassGroups}
                  selectedId={calSelectedGroup}
                  onChange={(id: string) => {
                    setCalSelectedGroup(id);
                  }}
                />
              )}

              <div className="flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                <SegmentedControl
                  options={[
                    {
                      label: (
                        <div
                          className="flex items-center justify-center"
                          title="Grid View"
                        >
                          <GridView className="w-3.5 h-3.5" />
                        </div>
                      ),
                      value: 'grid',
                    },
                    {
                      label: (
                        <div
                          className="flex items-center justify-center"
                          title="List View"
                        >
                          <List className="w-3.5 h-3.5" />
                        </div>
                      ),
                      value: 'list',
                    },
                  ]}
                  value={calViewMode}
                  onChange={(val) => setCalViewMode(val as any)}
                />
              </div>
            </div>
          )}

          {currentView === 'marks' && (
            <div
              key="marks-controls"
              className="flex items-center gap-2 mr-1 md:mr-2"
            >
              <SemesterDropdown
                semesters={marksSemesters}
                selectedId={marksSelectedSem}
                onChange={(id: string) => {
                  setMarksSelectedSem(id);
                }}
              />
            </div>
          )}

          {currentView === 'grades' && (
            <div
              key="grades-controls"
              className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
            >
              <SemesterDropdown
                semesters={gradesSemesters}
                selectedId={gradesSelectedSem}
                onChange={(id: string) => setGradesSelectedSem(id)}
              />
            </div>
          )}

          {currentView === 'curriculum' && (
            <div
              key="curriculum-controls"
              className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
            >
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] md:text-xs font-bold text-(--text-muted) uppercase">
                  Hide Done
                </span>
                <MaterialSwitch
                  label="Hide completed courses"
                  selected={curriculumHideCompleted}
                  onChange={(checked) => setCurriculumHideCompleted(checked)}
                />
              </div>
            </div>
          )}

          {currentView === 'coursePage' && (
            <div
              key="coursePage-controls"
              className="flex items-center gap-2 mr-1 md:mr-2"
            >
              <SemesterDropdown
                semesters={cpSemesters}
                selectedId={cpSelectedSem}
                onChange={handleCoursePageSemChange}
              />
            </div>
          )}

          {currentView === 'digitalAssignments' && (
            <div
              key="digitalAssignments-controls"
              className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
            >
              <SemesterDropdown
                semesters={daSemesters}
                selectedId={daSelectedSem}
                onChange={(id: string) => {
                  setDaSelectedSem(id);
                  if (network) {
                    fetchDACourses(network, id);
                  }
                }}
              />
            </div>
          )}

          {currentView === 'examSchedule' && (
            <div
              key="examSchedule-controls"
              className="flex items-center gap-2 mr-1 md:mr-2 pointer-events-auto"
            >
              <SemesterDropdown
                semesters={examSemesters}
                selectedId={examSelectedSem}
                onChange={(id: string) => {
                  setExamSelectedSem(id);
                  if (network) {
                    fetchExamSchedule(network, id);
                  }
                }}
              />
            </div>
          )}

          {currentView === 'attendance' && (
            <div
              key="attendance-controls"
              className="flex items-center gap-2 mr-1 md:mr-2"
            >
              <SemesterDropdown
                semesters={ttSemesters}
                selectedId={attSelectedSem}
                onChange={(sem: string) => setAttSelectedSem(sem)}
              />
            </div>
          )}
        </div>

        {/* Mobile 3-Dot Options Menu */}
        {[
          'timetable',
          'calendar',
          'marks',
          'grades',
          'curriculum',
          'coursePage',
          'digitalAssignments',
          'examSchedule',
          'attendance',
        ].includes(currentView) && (
          <div className="sm:hidden relative flex items-center">
            <button
              type="button"
              aria-label="Page options"
              aria-haspopup="dialog"
              aria-expanded={isMobileControlsOpen}
              aria-controls="topbar-mobile-options"
              onClick={() => setIsMobileControlsOpen(!isMobileControlsOpen)}
              className="min-w-12 min-h-12 flex items-center justify-center rounded-full bg-transparent text-(--text-muted) hover:text-(--text-main) outline-none focus-visible:ring-2 focus-visible:ring-(--accent-base) transition-all cursor-pointer"
            >
              <MoreVert className="w-5 h-5" />
            </button>

            {isMobileControlsOpen && (
              <>
                <div
                  aria-hidden="true"
                  className="fixed inset-0 z-99998 bg-black/60 backdrop-blur-xs transition-opacity"
                  onClick={() => setIsMobileControlsOpen(false)}
                />
                <div
                  id="topbar-mobile-options"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Page options"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsMobileControlsOpen(false);
                  }}
                  className="fixed inset-x-0 bottom-0 z-99999 p-3 pb-6 sm:p-4 max-h-[85vh] flex flex-col justify-end pointer-events-none"
                >
                  <div className="w-full max-w-lg mx-auto bg-(--bg-surface) border-2 border-(--border-main) rounded-[32px] p-5 sm:p-6 shadow-2xl flex flex-col gap-3.5 animate-sheet-up max-h-[80vh] overflow-y-auto pointer-events-auto">
                    {/* Bottom Sheet Drag Handle */}
                    <div className="w-12 h-1.5 bg-(--border-main) rounded-full mx-auto -mt-1 mb-1 opacity-60" />

                    {currentView === 'timetable' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                          <SegmentedControl
                            options={[
                              {
                                label: (
                                  <div
                                    className="flex items-center justify-center"
                                    title="Grid View"
                                  >
                                    <GridView className="w-3.5 h-3.5" />
                                  </div>
                                ),
                                value: 'grid',
                              },
                              {
                                label: (
                                  <div
                                    className="flex items-center justify-center"
                                    title="List View"
                                  >
                                    <List className="w-3.5 h-3.5" />
                                  </div>
                                ),
                                value: 'list',
                              },
                              {
                                label: (
                                  <div
                                    className="flex items-center justify-center"
                                    title="Week View"
                                  >
                                    <CalendarMonth className="w-3.5 h-3.5" />
                                  </div>
                                ),
                                value: 'week',
                              },
                            ]}
                            value={ttViewMode}
                            onChange={(val) => setTtViewMode(val as any)}
                          />
                        </div>
                        <SemesterDropdown
                          semesters={ttSemesters}
                          selectedId={ttSelectedSem}
                          onChange={(id: string) => {
                            onTimetableSemChange?.(id);
                            setIsMobileControlsOpen(false);
                          }}
                        />
                      </div>
                    )}

                    {currentView === 'calendar' && (
                      <div className="flex flex-col gap-3">
                        <div className="flex bg-transparent rounded-full border-2 border-(--border-main) shadow-(--brutal-shadow-sm) items-center">
                          <SegmentedControl
                            options={[
                              {
                                label: (
                                  <div
                                    className="flex items-center justify-center"
                                    title="Grid View"
                                  >
                                    <GridView className="w-3.5 h-3.5" />
                                  </div>
                                ),
                                value: 'grid',
                              },
                              {
                                label: (
                                  <div
                                    className="flex items-center justify-center"
                                    title="List View"
                                  >
                                    <List className="w-3.5 h-3.5" />
                                  </div>
                                ),
                                value: 'list',
                              },
                            ]}
                            value={calViewMode}
                            onChange={(val) => setCalViewMode(val as any)}
                          />
                        </div>
                        <SemesterDropdown
                          semesters={calSemesters}
                          selectedId={calSelectedSem}
                          onChange={(id: string) => {
                            setCalSelectedSem(id);
                            setIsMobileControlsOpen(false);
                          }}
                        />
                        {calClassGroups.length > 0 && (
                          <ClassGroupDropdown
                            groups={calClassGroups}
                            selectedId={calSelectedGroup}
                            onChange={(id: string) => {
                              setCalSelectedGroup(id);
                              setIsMobileControlsOpen(false);
                            }}
                          />
                        )}
                      </div>
                    )}

                    {currentView === 'marks' && (
                      <div className="flex flex-col gap-3">
                        <SemesterDropdown
                          semesters={marksSemesters}
                          selectedId={marksSelectedSem}
                          onChange={(id: string) => {
                            setMarksSelectedSem(id);
                            setIsMobileControlsOpen(false);
                          }}
                        />
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs font-bold text-(--text-main)">
                            Modern View
                          </span>
                          <MaterialSwitch
                            label="Modern view"
                            selected={isMarksModernView}
                            onChange={(checked) =>
                              setIsMarksModernView(checked)
                            }
                          />
                        </div>
                      </div>
                    )}

                    {currentView === 'grades' && (
                      <SemesterDropdown
                        semesters={gradesSemesters}
                        selectedId={gradesSelectedSem}
                        onChange={(id: string) => {
                          setGradesSelectedSem(id);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}

                    {currentView === 'curriculum' && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-bold text-(--text-main)">
                          Hide Completed
                        </span>
                        <MaterialSwitch
                          label="Hide completed courses"
                          selected={curriculumHideCompleted}
                          onChange={(checked) =>
                            setCurriculumHideCompleted(checked)
                          }
                        />
                      </div>
                    )}

                    {currentView === 'digitalAssignments' && (
                      <SemesterDropdown
                        semesters={daSemesters}
                        selectedId={daSelectedSem}
                        onChange={(id: string) => {
                          setDaSelectedSem(id);
                          if (network) fetchDACourses(network, id);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}

                    {currentView === 'examSchedule' && (
                      <SemesterDropdown
                        semesters={examSemesters}
                        selectedId={examSelectedSem}
                        onChange={(id: string) => {
                          setExamSelectedSem(id);
                          if (network) fetchExamSchedule(network, id);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}

                    {currentView === 'coursePage' && (
                      <SemesterDropdown
                        semesters={cpSemesters}
                        selectedId={cpSelectedSem}
                        onChange={(sem: string) => {
                          handleCoursePageSemChange(sem);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}

                    {currentView === 'attendance' && (
                      <SemesterDropdown
                        semesters={ttSemesters}
                        selectedId={attSelectedSem}
                        onChange={(sem: string) => {
                          setAttSelectedSem(sem);
                          setIsMobileControlsOpen(false);
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
