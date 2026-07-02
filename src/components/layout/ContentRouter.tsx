import { ProgressActivity } from '@nine-thirty-five/material-symbols-react/rounded';
import { HomeView } from "../../pages/home";
import { TimetableContentView } from "../../pages/timetable";
import { CurriculumPage } from "../../pages/curriculum";
import { MarksPage } from "../../pages/marks";
import { ProfilePage } from "../../pages/profile";
import { SettingsPage } from "../../pages/settings";
import { CoursePage } from "../../pages/course-page";
import { CalendarPage } from "../../pages/calendar";
import { AttendancePage } from "../../pages/attendance";

export const ContentRouter = ({
  currentView,
  networkRef,
  settings,
  updateSetting,
  stats,
  attendance,
  assignments,
  upcoming,
  dayName,
  menu,
  handleLinkClick,
  ttCourses,
  ttLoading,
  ttViewMode,
  setTtViewMode,
  cpOptions,
  setCpOptions,
  cpSemesters,
  setCpSemesters,
  cpSelectedSem,
  setCpSelectedSem,
  cpSelectedCourseId,
  setCpSelectedCourseId,
  calSemesters,
  setCalSemesters,
  calSelectedSem,
  setCalSelectedSem,
  marksSemesters,
  setMarksSemesters,
  marksSelectedSem,
  setMarksSelectedSem,
  marksSearchQuery,
  isMarksModernView,
  ttSemesters,
  ttSelectedSem,
  events,
  pinnedLinks,
  handleTogglePin,
}: any) => {
  if (!networkRef.current) return null;

  switch (currentView) {
    case "dashboard":
      return (
        <HomeView
          settings={settings}
          stats={stats}
          attendance={attendance}
          assignments={assignments}
          events={events}
          upcoming={upcoming}
          dayName={dayName}
          menuCategories={menu}
          onNavigate={handleLinkClick}
          ttCourses={ttCourses}
          use24HourTime={settings.use24HourTime ?? true}
          calSemesters={calSemesters?.length ? calSemesters : ttSemesters}
          calSelectedSem={calSelectedSem || ttSelectedSem}
          pinnedLinks={pinnedLinks}
          handleTogglePin={handleTogglePin}
        />
      );
    case "timetable":
      return (
        <TimetableContentView
          courses={ttCourses}
          loading={ttLoading}
          viewMode={ttViewMode}
          setViewMode={setTtViewMode}
          attendance={attendance}
          use24HourTime={settings.use24HourTime ?? true}
        />
      );
    case "curriculum":
      return <CurriculumPage onBack={() => {}} network={networkRef.current} />;
    case "marks":
      return (
        <MarksPage
          network={networkRef.current}
          semesters={marksSemesters}
          setSemesters={setMarksSemesters}
          selectedSem={marksSelectedSem}
          setSelectedSem={setMarksSelectedSem}
          searchQuery={marksSearchQuery}
          isModernView={isMarksModernView}
        />
      );
    case "profile":
      return <ProfilePage network={networkRef.current} />;
    case "settings":
      return <SettingsPage settings={settings} updateSetting={updateSetting} />;

    case "coursePage":
      return (
        <CoursePage
          network={networkRef.current}
          menu={menu}
          cpOptions={cpOptions}
          setCpOptions={setCpOptions}
          cpSemesters={cpSemesters}
          setCpSemesters={setCpSemesters}
          selectedSem={cpSelectedSem}
          setSelectedSem={setCpSelectedSem}
          selectedOptionId={cpSelectedCourseId}
          setSelectedOptionId={setCpSelectedCourseId}
        />
      );

    case "calendar":
      return <CalendarPage network={networkRef.current!} />;

    case "attendance":
      return <AttendancePage network={networkRef.current!} />;

    case "content":
      return (
        <div className="flex flex-col items-center justify-center h-full text-(--text-muted) font-mono animate-pulse pointer-events-auto">
          <ProgressActivity className="w-16 h-16 text-(--accent-base) animate-spin mb-4" />
          <span className="text-xl font-bold font-expanded mb-0">
            LAUNCHING LEGACY SYSTEM...
          </span>
        </div>
      );
    default:
      return null;
  }
};
