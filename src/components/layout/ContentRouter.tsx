import { Loader2 } from "lucide-react";
import { HomeView } from "../../pages/home";
import { TimetableContentView } from "../../pages/timetable";
import { CurriculumPage } from "../../pages/curriculum";
import { MarksPage } from "../../pages/marks";
import { ProfilePage } from "../../pages/profile";
import { SettingsPage } from "../../pages/settings";
import { CoursePage } from "../../pages/course-page";

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
}: any) => {
  if (!networkRef.current) return null;

  switch (currentView) {
    case "dashboard":
      return (
        <HomeView
          showProgress={settings.showSemesterProgress}
          stats={stats}
          attendance={attendance}
          assignments={assignments}
          upcoming={upcoming}
          dayName={dayName}
          menuCategories={menu}
          onNavigate={handleLinkClick}
        />
      );
    case "timetable":
      return (
        <TimetableContentView
          courses={ttCourses}
          loading={ttLoading}
          viewMode={ttViewMode}
          setViewMode={setTtViewMode} // <-- PASSED IT HERE
        />
      );
    case "curriculum":
      return <CurriculumPage onBack={() => {}} network={networkRef.current} />;
    case "marks":
      return <MarksPage onBack={() => {}} network={networkRef.current} />;
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

    case "content":
      return (
        <div className="flex flex-col items-center justify-center h-full text-(--text-muted) font-mono animate-pulse pointer-events-auto">
          <Loader2 className="w-16 h-16 text-(--accent-base) animate-spin mb-4" />
          <span className="text-xl font-bold font-expanded mb-0">
            LAUNCHING LEGACY SYSTEM...
          </span>
        </div>
      );
    default:
      return null;
  }
};
