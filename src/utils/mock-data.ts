import {
  MenuCategory,
  CourseSummary,
  Assignment,
  TimetableCourse,
  Semester,
  CoursePageOption,
  CourseOutcome,
  SyllabusModule,
  CourseMaterial,
  CurriculumCategory,
  CurriculumCourse,
  MarksSemester,
  CourseMarks,
  StudentProfile,
} from "../types/vtop";

export const MOCK_MENU: MenuCategory[] = [
  {
    id: "academics",
    title: "Academics",
    links: [
      { title: "Time Table", url: "/studenttimetable", category: "Academics" },
      { title: "Curriculum", url: "/curriculum", category: "Academics" },
      { title: "Course Page", url: "/coursepage", category: "Academics" },
    ],
  },
  {
    id: "examinations",
    title: "Examinations",
    links: [
      {
        title: "Student Grade View",
        url: "/gradeview",
        category: "Examinations",
      },
      {
        title: "Student Marks View",
        url: "/marksview",
        category: "Examinations",
      },
    ],
  },
  {
    id: "profile",
    title: "Profile",
    links: [
      {
        title: "Student Profile View",
        url: "/studentprofileallview",
        category: "Profile",
      },
    ],
  },
];

export const MOCK_ATTENDANCE: CourseSummary[] = [
  {
    code: "CSE2005",
    name: "Operating Systems",
    type: "Theory Only",
    slot: "A1+TA1",
    faculty: "Dr. Smith",
    attendance: "85%",
    attended: 34,
    total: 40,
  },
  {
    code: "CSE2006",
    name: "Microprocessor and Interfacing",
    type: "Embedded Theory and Practice",
    slot: "B1+TB1",
    faculty: "Dr. Johnson",
    attendance: "92%",
    attended: 46,
    total: 50,
  },
  {
    code: "CSE2001",
    name: "Data Structures and Algorithms",
    type: "Embedded Theory and Lab",
    slot: "C1+TC1+L31+L32+S1",
    faculty: "Dr. Williams",
    attendance: "88%",
    attended: 22,
    total: 25,
  },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    title: "Process Scheduling Algorithms Implementation",
    course: "CSE2005 - Operating Systems",
    dueDate: "2024-04-15",
  },
  {
    title: "Assembly Language Programming",
    course: "CSE2006 - Microprocessor",
    dueDate: "2024-04-20",
  },
];

// --- TIMETABLE & COURSE PAGE DATA ---
export const MOCK_SEMESTERS: Semester[] = [
  { id: "WIN2023", label: "Winter Semester 2023-24", isLatest: true },
  { id: "FALL2023", label: "Fall Semester 2023-24", isLatest: false },
];

export const MOCK_TIMETABLE: TimetableCourse[] = [
  {
    code: "CSE2005",
    title: "Operating Systems",
    type: "ETH",
    credits: "4",
    category: "PC",
    slot: "A1+TA1",
    venue: "SJT 101",
    faculty: "Dr. Smith",
    classId: "CR1001",
    status: "Registered",
  },
  {
    code: "CSE2006",
    title: "Microprocessor and Interfacing",
    type: "ELA",
    credits: "1",
    category: "PC",
    slot: "L11+L12",
    venue: "SJT 205 (Lab)",
    faculty: "Dr. Johnson",
    classId: "CR1002",
    status: "Registered",
  },
  {
    code: "CSE2001",
    title: "Data Structures and Algorithms",
    type: "ETH",
    credits: "4",
    category: "PC",
    slot: "C1+TC1",
    venue: "SJT 302",
    faculty: "Dr. Williams",
    classId: "CR1003",
    status: "Registered",
  },
  {
    code: "CSE2001",
    title: "Data Structures and Algorithms",
    type: "ELA",
    credits: "0",
    category: "PC",
    slot: "L31+L32+S1", // S1 indicates Saturday Slot 1
    venue: "TT 401 (Lab)",
    faculty: "Dr. Williams",
    classId: "CR1003",
    status: "Registered",
  },
  {
    code: "STS2001",
    title: "Soft Skills",
    type: "SS",
    credits: "1",
    category: "UC",
    slot: "S11+S12", // Weekend specific slots
    venue: "SJT 701",
    faculty: "Prof. Miller",
    classId: "CR1004",
    status: "Registered",
  },
];

export const MOCK_COURSE_OPTIONS: CoursePageOption[] = [
  {
    code: "CSE2005",
    title: "Operating Systems",
    classId: "CR1001",
    semester: "WIN2023",
    type: "Theory",
    credits: "3",
    rawText: "CSE2005 - Operating Systems - CR1001",
  },
];

export const MOCK_COURSE_OUTCOMES: CourseOutcome[] = [
  {
    number: "CO1",
    description: "Understand the basic concepts of operating systems.",
  },
  {
    number: "CO2",
    description: "Analyze process scheduling and synchronization.",
  },
];

export const MOCK_COURSE_SYLLABUS: SyllabusModule[] = [
  {
    number: "1",
    title: "Introduction",
    topics: "OS architecture, System calls.",
  },
  {
    number: "2",
    title: "Process Management",
    topics: "Threads, CPU Scheduling algorithms.",
  },
];

export const MOCK_COURSE_MATERIALS: CourseMaterial[] = [
  {
    id: "M1",
    index: "1",
    title: "Unit 1 - Introduction Slides",
    category: "Lecture Material",
    faculty: "Dr. Smith",
    uploadDate: "2024-01-10",
    downloadId: "dl_101",
  },
];

// --- CURRICULUM DATA ---
export const MOCK_CURRICULUM_CATEGORIES: CurriculumCategory[] = [
  {
    id: "PC",
    title: "Programme Core",
    credits: "45",
    maxCredits: "60",
    isCompleted: false,
  },
  {
    id: "UC",
    title: "University Core",
    credits: "53",
    maxCredits: "53",
    isCompleted: true,
  },
];

export const MOCK_CURRICULUM_COURSES: Record<string, CurriculumCourse[]> = {
  PC: [
    {
      sl: "1",
      code: "CSE1001",
      title: "Problem Solving and Programming",
      type: "P",
      credits: "3",
      l: "0",
      t: "0",
      p: "6",
      j: "0",
      basket: "None",
    },
    {
      sl: "2",
      code: "CSE2005",
      title: "Operating Systems",
      type: "E",
      credits: "4",
      l: "3",
      t: "0",
      p: "2",
      j: "0",
      basket: "None",
    },
    {
      sl: "3",
      code: "CSE2001",
      title: "Data Structures and Algorithms",
      type: "E",
      credits: "4",
      l: "3",
      t: "0",
      p: "2",
      j: "0",
      basket: "None",
    },
  ],
};

// --- MARKS DATA ---
export const MOCK_MARKS_SEMESTERS: MarksSemester[] = [
  { id: "WIN2023", name: "Winter Semester 2023-24" },
];

export const MOCK_COURSE_MARKS: CourseMarks[] = [
  {
    code: "CSE2005",
    title: "Operating Systems",
    type: "Theory",
    credits: "3",
    classNumber: "CR1001",
    slot: "A1",
    faculty: "Dr. Smith",
    assessments: [
      {
        title: "CAT1",
        maxMark: "50",
        weightage: "15",
        scoredMark: "45",
        scoredPercentage: "90%",
        status: "Present",
      },
      {
        title: "CAT2",
        maxMark: "50",
        weightage: "15",
        scoredMark: "48",
        scoredPercentage: "96%",
        status: "Present",
      },
    ],
  },
  {
    code: "CSE2001",
    title: "Data Structures and Algorithms",
    type: "Lab",
    credits: "1",
    classNumber: "CR1003",
    slot: "S1", // Saturday Assessment
    faculty: "Dr. Williams",
    assessments: [
      {
        title: "Lab FAT",
        maxMark: "100",
        weightage: "50",
        scoredMark: "92",
        scoredPercentage: "92%",
        status: "Present",
      },
    ],
  },
];
// --- DASHBOARD DATA ---
export const MOCK_USER = {
  name: "JANE DOE",
  regNo: "21BCE5678",
};

export const MOCK_STATS = {
  cgpa: "9.12",
  credits: "78",
};

// --- PROFILE DATA ---
export const MOCK_PROFILE: StudentProfile = {
  basic: {
    name: "JANE DOE",
    regNo: "21BCE5678",
    email: "jane.doe2021@reitstudent.ac.in",
    program: "B.Tech Computer Science and Engineering",
    school: "SCOPE",
    photoUrl: "/assets/photo.png",
  },
  personal: {
    appNo: "2021876543",
    dob: "15-Aug-2003",
    gender: "Female",
    bloodGroup: "A+",
    community: "OC",
    caste: "-",
    religion: "Christian",
    nationality: "Indian",
    nativeState: "Karnataka",
    nativeLanguage: "Kannada",
    physicallyChallenged: "No",
    aadhar: "0",
    mobile: "9123456789",
    email: "jane_personal@example.com",
  },
  currentAddress: {
    street: "45 MG Road",
    area: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    pincode: "560038",
    phone: "9123456789",
  },
  permanentAddress: {
    street: "45 MG Road",
    area: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    pincode: "560038",
    phone: "9123456789",
  },
  education: {
    degree: "HSC",
    qualification: "12th Standard",
    branch: "PCMC",
    school: "ABC Public School",
    medium: "English",
    board: "CBSE",
    regNo: "CBSE98765",
    classObtained: "Distinction",
    year: "2021",
    month: "May",
    breakInStudy: "No",
    breakReason: "-",
    address: {
      street: "-",
      area: "-",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      pincode: "560038",
      phone: "-",
    },
  },
  family: {
    brothers: "0",
    sisters: "1",
    studyingInVit: "No",
    studyingDetails: "-",
    studiedInVit: "No",
    studiedDetails: "-",
    father: {
      name: "Mr. Robert Doe",
      qualification: "M.Tech",
      occupation: "Software Architect",
      organization: "Global Tech",
      designation: "Director",
      mobile: "9900112233",
      email: "robert.doe@example.com",
      income: "25,00,000",
      address: {
        street: "-",
        area: "-",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        pincode: "560038",
        phone: "-",
      },
    },
    mother: {
      name: "Mrs. Sarah Doe",
      qualification: "MBA",
      occupation: "HR Manager",
      organization: "Corporate Solutions",
      designation: "Lead HR",
      mobile: "9900112244",
      email: "sarah.doe@example.com",
      income: "15,00,000",
      address: {
        street: "-",
        area: "-",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        pincode: "560038",
        phone: "-",
      },
    },
    guardian: "-",
    friendMobile: "9845012345",
  },
  proctor: {
    id: "EMP1234",
    name: "Dr. Alan Turing",
    designation: "Professor",
    school: "SCOPE",
    cabin: "SJT 410",
    dept: "Computer Science",
    email: "alan.turing@reit.ac.in",
    mobile: "9876500000",
    photoUrl: "/assets/proctor.png",
  },
  hostel: {
    appNo: "2021876543",
    regNo: "21BCE5678",
    block: "Ladies Hostel - J Block", // Updated to a female block
    room: "402",
    bedType: "3 Bed AC",
    mess: "Veg Mess",
  },
};
