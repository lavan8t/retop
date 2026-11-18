/**
 * Shared presentation rules: the page-title seam and the content measure.
 * The bar and the app are adapters over these rules.
 */
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

/** Readable content measure; opted out by views that need the full width. */
export const CONTENT_WIDTH_CLASS = 'max-w-[1040px] w-full mx-auto';

export const isFullWidthView = (view: string): boolean => view === 'coursePage';
