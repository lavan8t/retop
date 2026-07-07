export type ViewType = "dashboard" | "timetable" | "curriculum" | "marks" | "grades" | "profile" | "settings" | "coursePage" | "calendar" | "attendance" | "content";

export interface QuickLink {
  title: string;
  url: string;
  category: string;
}

export interface MenuCategory {
  id: string;
  title: string;
  links: QuickLink[];
}

export interface CourseSummary {
  code: string;
  name: string;
  type?: string;
  slot: string;
  faculty: string;
  attendance: string;
  attended?: number;
  total?: number;
}

export interface Assignment {
  title: string;
  course: string;
  dueDate: string;
  status?: string;
}
export interface Event {
  title: string;
  category: string;
  date: string;
  organizer: string;
}

export interface TimetableCourse {
  code: string;
  title: string;
  type: string;
  credits: string;
  category: string;
  slot: string;
  venue: string;
  faculty: string;
  classId: string;
  status: string;
}

export interface CurriculumCategory {
  id: string;
  title: string;
  credits: string;
  maxCredits: string;
  isCompleted: boolean;
}

export interface CurriculumCourse {
  sl: string;
  code: string;
  title: string;
  type: string;
  credits: string;
  l: string;
  t: string;
  p: string;
  j: string;
  basket: string;
}

export interface MarksSemester {
  id: string;
  name: string;
}

export interface AssessmentMark {
  title: string;
  maxMark: string;
  weightage: string;
  scoredMark: string;
  scoredPercentage: string;
  status: string;
}

export interface CourseMarks {
  code: string;
  title: string;
  type: string;
  credits: string;
  classNumber: string;
  slot: string;
  faculty: string;
  assessments: AssessmentMark[];
}
export interface Assessment {
  title: string;
  maxMark: string;
  weightage: string;
  status: string;
  scoredMark: string;
  scoredPercentage: string;
}
export interface ProfileBasicInfo {
  name: string;
  regNo: string;
  email: string;
  program: string;
  school: string;
  photoUrl: string;
}

export interface ProfilePersonal {
  appNo: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  community: string;
  caste: string;
  religion: string;
  nationality: string;
  nativeState: string;
  nativeLanguage: string;
  physicallyChallenged: string;
  aadhar: string;
  mobile: string;
  email: string;
}

export interface Address {
  street: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
}

export interface ProfileEducation {
  degree: string;
  qualification: string;
  branch: string;
  school: string;
  medium: string;
  board: string;
  regNo: string;
  classObtained: string;
  year: string;
  month: string;
  breakInStudy: string;
  breakReason: string;
  address: Address;
}

export interface ProfileFamilyMember {
  name: string;
  qualification: string;
  occupation: string;
  organization: string;
  designation: string;
  mobile: string;
  email: string;
  income: string;
  address: Address;
}

export interface ProfileFamily {
  brothers: string;
  sisters: string;
  studyingInVit: string;
  studyingDetails: string;
  studiedInVit: string;
  studiedDetails: string;
  father: ProfileFamilyMember;
  mother: ProfileFamilyMember;
  guardian: string;
  friendMobile: string;
}

export interface ProfileProctor {
  id: string;
  name: string;
  designation: string;
  school: string;
  cabin: string;
  dept: string;
  email: string;
  mobile: string;
  photoUrl: string;
}

export interface ProfileHostel {
  appNo: string;
  regNo: string;
  block: string;
  room: string;
  bedType: string;
  mess: string;
}

export interface StudentProfile {
  basic: ProfileBasicInfo;
  personal: ProfilePersonal;
  currentAddress: Address;
  permanentAddress: Address;
  education: ProfileEducation;
  family: ProfileFamily;
  proctor: ProfileProctor;
  hostel: ProfileHostel | null;
}

export interface CoursePageOption {
  code: string;
  title: string;
  classId: string;
  semester: string;
  type: string;
  credits: string;
  rawText: string;
}

export interface CourseMaterial {
  id: string;
  index: string;
  title: string;
  category: string;
  faculty: string;
  uploadDate: string;
  downloadId: string;
}

export interface CourseOutcome {
  number: string;
  description: string;
}

export interface SyllabusModule {
  number: string;
  title: string;
  topics: string;
  blooms?: string;
}

export interface CoursePageData {
  options: CoursePageOption[];
  selectedCourseId: string | null;
  outcomes: CourseOutcome[];
  syllabus: SyllabusModule[];
  materials: CourseMaterial[];
  books?: string[];
}

export interface Semester {
  id: string;
  label: string;
  isLatest: boolean;
}

export interface DigitalAssignmentCourse {
  classId: string;
  courseCode: string;
  courseTitle: string;
  courseType: string;
  faculty: string;
}

export interface DigitalAssignment {
  title: string;
  maxMark: string;
  weightage: string;
  dueDate: string;
  uploadDate: string;
  qpCode?: string;
  qpClassId?: string;
  uploadCode?: string;
  uploadClassId?: string;
  studentCode?: string;
  studentClassId?: string;
}

export interface DAUploadFormData {
  action: string;
  hiddenInputs: Record<string, string>;
  allowedExtensions: string[];
  maxSize?: string;
}
export interface CalendarMonthPreview {
  label: string;
  dateString: string;
}

export interface ClassGroup {
  id: string;
  label: string;
}

export interface CalendarEvent {
  dayNumber: string;
  info: string;
  subInfo: string;
  isHoliday: boolean;
  isInstructional: boolean;
  isExam: boolean;
  dateObj: Date;
}
export interface DetailedAttendanceCourse {
  slNo: string;
  courseCode: string;
  courseTitle: string;
  courseType: string;
  classType: string;
  classDetail: string; // e.g., VL2025260502310 - TAA1 - PRP124
  faculty: string;
  attended: number;
  total: number;
  percentage: number;
  debarStatus: string;
  // Payload for fetching detail
  semesterSubId: string;
  courseId: string;
}

export interface AttendanceRecord {
  slNo: string;
  date: string;
  slot: string;
  dayTime: string;
  status: string;
}

export interface GradesSemester {
  id: string;
  name: string;
}

export interface GradeCourse {
  code: string;
  title: string;
  type: string;
  credits: string; // "L P J C" wait, no, "3.0"
  l: string;
  p: string;
  j: string;
  c: string;
  gradingType: string;
  grandTotal: string;
  grade: string;
  courseId: string; // for view mark
  notIncludedInGpa: boolean;
  classStrength?: string;
  gradingStrength?: string;
  mean?: string;
  sd?: string;
  gradesRange?: {
    S: string;
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
    F: string;
  };
  assessments?: GradeAssessment[];
}

export interface GradeAssessment {
  title: string;
  maxMark: string;
  weightage: string;
  status: string;
  scoredMark: string;
  weightageMark: string;
}

export interface GradesData {
  gpa: string;
  courses: GradeCourse[];
}

export interface GradeHistoryCourse {
  slNo: string;
  code: string;
  title: string;
  type: string;
  credits: string;
  grade: string;
  examMonth: string;
  resultDeclared: string;
  courseDistribution: string;
  details?: GradeHistoryCourseDetail[]; // the inner table rows
}

export interface GradeHistoryCourseDetail {
  code: string;
  title: string;
  type: string;
  credits: string;
  grade: string;
  examMonth: string;
  resultDeclared: string;
}

export interface CGPADetails {
  creditsRegistered: string;
  creditsEarned: string;
  cgpa: string;
  s: string;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
  n: string;
}

export interface CurriculumDistribution {
  title: string;
  required: string;
  earned: string;
}

export interface BasketDetails {
  title: string;
  distributionType: string;
  required: string;
  earned: string;
}

export interface GradeHistoryData {
  courses: GradeHistoryCourse[];
  cgpa: CGPADetails | null;
  curriculum: CurriculumDistribution[];
  baskets: BasketDetails[];
}
