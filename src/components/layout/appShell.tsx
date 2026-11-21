/**
 * Shared presentation rule: the page-title seam.
 * The bar and the app are adapters over this rule.
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
    case 'biometric':
      return 'Biometric Log';
    case 'content':
      return dynamicTitle || 'Legacy View';
    default:
      return '';
  }
};
