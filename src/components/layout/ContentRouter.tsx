import { VitEmblemLoader } from "../common/VitEmblemLoader";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { HomeView } from "../../pages/home";
import { TimetableContentView } from "../../pages/timetable";
import { CurriculumPage } from "../../pages/curriculum";
import { MarksPage } from "../../pages/marks";
import { GradesPage } from "../../pages/grades";
import { ProfilePage } from "../../pages/profile";
import { SettingsPage } from "../../pages/settings";
import { CoursePage } from "../../pages/course-page";
import { CalendarPage } from "../../pages/calendar";
import { AttendancePage } from "../../pages/attendance";
import DigitalAssignments from "../../pages/digital-assignments";
import { ExamSchedulePage } from "../../pages/exam-schedule";
import { LateHourPage } from "../../pages/late-hour";

import { useAppStore } from "../../store/appStore";
import { useDataStore } from "../../store/dataStore";

export const ContentRouter = ({
  currentView,
  networkRef,
  settings,
  updateSetting,
  menu,
  handleLinkClick,
  events,
  pinnedLinks,
  handleTogglePin,
  spotlightCategories,
  onSync,
}: any) => {
  const appState = useAppStore();
  const dataState = useDataStore();
  
  if (!networkRef.current) return null;

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <HomeView
            settings={settings}
            stats={dataState.stats}
            attendance={dataState.attendance}
            assignments={dataState.assignments}
            events={events}
            upcoming={dataState.upcoming}
            dayName={"Today"}
            menuCategories={menu}
            onNavigate={handleLinkClick}
            ttCourses={dataState.ttCourses}
            use24HourTime={settings.timeFormat ?? "12h"}

            calSemesters={dataState.calSemesters?.length ? dataState.calSemesters : dataState.ttSemesters}
            calSelectedSem={dataState.calSelectedSem || dataState.ttSelectedSem}
            pinnedLinks={pinnedLinks}
            handleTogglePin={handleTogglePin}
            spotlightCategories={spotlightCategories}
            network={networkRef.current}
            onSync={onSync}
          />
        );
      case "timetable":
        return (
          <TimetableContentView
            courses={dataState.ttCourses}
            loading={dataState.ttLoading}
            viewMode={appState.ttViewMode}
            setViewMode={appState.setTtViewMode}
            attendance={dataState.attendance}
            use24HourTime={settings.timeFormat ?? "12h"}

          />
        );
      case "curriculum":
        return <CurriculumPage onBack={() => {}} network={networkRef.current} />;
      case "marks":
        return (
          <MarksPage
            network={networkRef.current}
            semesters={appState.marksSemesters}
            setSemesters={appState.setMarksSemesters}
            selectedSem={appState.marksSelectedSem}
            setSelectedSem={appState.setMarksSelectedSem}
            searchQuery={appState.marksSearchQuery}
            isModernView={appState.isMarksModernView}
          />
        );
      case "grades":
        return (
          <GradesPage
            network={networkRef.current}
            semesters={appState.gradesSemesters}
            setSemesters={appState.setGradesSemesters}
            selectedSem={appState.gradesSelectedSem}
            setSelectedSem={appState.setGradesSelectedSem}
          />
        );
      case "profile":
        return <ProfilePage network={networkRef.current} />;
      case "settings":
        return <SettingsPage settings={settings} updateSetting={updateSetting} network={networkRef.current} />;

      case "coursePage":
        return (
          <CoursePage
            network={networkRef.current}
            menu={menu}
            cpOptions={appState.cpOptions}
            setCpOptions={appState.setCpOptions}
            cpSemesters={dataState.ttSemesters}
            setCpSemesters={() => {}}
            selectedSem={dataState.cpSelectedSem}
            setSelectedSem={dataState.setCpSelectedSem}
            selectedOptionId={appState.cpSelectedCourseId}
            setSelectedOptionId={appState.setCpSelectedCourseId}
            searchTerm={appState.cpSearchTerm}
          />
        );

      case "calendar":
        return <CalendarPage network={networkRef.current!} />;

      case "attendance":
        return <AttendancePage network={networkRef.current!} />;

      case "digitalAssignments":
        return <DigitalAssignments network={networkRef.current} />;

      case "examSchedule":
        return <ExamSchedulePage network={networkRef.current} />;

      case "lateHour":
        return <LateHourPage network={networkRef.current} />;

      case "content":
        return (
          <div className="flex flex-col items-center justify-center h-full text-(--text-muted) pointer-events-auto">
            <span className="text-sm font-bold font-expanded tracking-wider animate-pulse text-(--text-muted)">
              LAUNCHING LEGACY SYSTEM...
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    // "fullscreen" so a crashed view hands VTOP back instead of leaving a dead
    // card on screen. On the standalone PWA the boundary still shows its own
    // error UI, because there is no VTOP to hand back to.
    <ErrorBoundary
      variant="fullscreen"
      name={currentView || "View"}
      resetKey={currentView}
    >
      {renderContent()}
    </ErrorBoundary>
  );
};
