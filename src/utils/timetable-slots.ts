import { TimetableCourse } from '../types/vtop';

// --- CONFIG ---
// We map standard VTOP slots to [DayIndex (0=Mon...6=LightMode), ColumnIndex (0-13)]
// Columns:
// 0: 08:00
// 1: 09:00
// 2: 10:00
// 3: 11:00
// 4: 12:00
// 5: 12:30 (Lab Only)
// 6: LUNCH
// 7: 14:00
// 8: 15:00
// 9: 16:00
// 10: 17:00
// 11: 18:00
// 12: 18:30 (Lab Only)
// 13: 19:00 (Theory Only)

export const CAMPUS_SLOT_TIMINGS: Record<
  'Theory' | 'Lab',
  { start: string; end: string }[]
> = {
  Theory: [
    { start: '08:00', end: '08:50' },
    { start: '09:00', end: '09:50' },
    { start: '10:00', end: '10:50' },
    { start: '11:00', end: '11:50' },
    { start: '12:00', end: '12:50' },
    { start: '-', end: '-' }, // 5: null (-)
    { start: '13:00', end: '14:00' }, // 6: Lunch
    { start: '14:00', end: '14:50' },
    { start: '15:00', end: '15:50' },
    { start: '16:00', end: '16:50' },
    { start: '17:00', end: '17:50' },
    { start: '18:00', end: '18:50' },
    { start: '18:51', end: '19:00' },
    { start: '19:01', end: '19:50' },
  ],
  Lab: [
    { start: '08:00', end: '08:50' },
    { start: '08:51', end: '09:40' },
    { start: '09:51', end: '10:40' },
    { start: '10:41', end: '11:30' },
    { start: '11:40', end: '12:30' },
    { start: '12:31', end: '13:20' },
    { start: '13:00', end: '14:00' }, // 6: Lunch
    { start: '14:00', end: '14:50' },
    { start: '14:51', end: '15:40' },
    { start: '15:51', end: '16:40' },
    { start: '16:41', end: '17:30' },
    { start: '17:40', end: '18:30' },
    { start: '18:31', end: '19:20' },
    { start: '-', end: '-' }, // 13: null (-)
  ],
};

export const CAMPUS_SLOTS: Record<string, { Theory: string[]; Lab: string[] }> =
  {
    Monday: {
      Theory: [
        'A1',
        'F1',
        'D1',
        'TB1',
        'TG1',
        '-',
        '-',
        'A2',
        'F2',
        'D2',
        'TB2',
        'TG2',
        '-',
        'V3',
      ],
      Lab: [
        'L1',
        'L2',
        'L3',
        'L4',
        'L5',
        'L6',
        '-',
        'L31',
        'L32',
        'L33',
        'L34',
        'L35',
        'L36',
        '-',
      ],
    },
    Tuesday: {
      Theory: [
        'B1',
        'G1',
        'E1',
        'TC1',
        'TAA1',
        '-',
        '-',
        'B2',
        'G2',
        'E2',
        'TC2',
        'TAA2',
        '-',
        'V4',
      ],
      Lab: [
        'L7',
        'L8',
        'L9',
        'L10',
        'L11',
        'L12',
        '-',
        'L37',
        'L38',
        'L39',
        'L40',
        'L41',
        'L42',
        '-',
      ],
    },
    Wednesday: {
      Theory: [
        'C1',
        'A1',
        'F1',
        'V1',
        'V2',
        '-',
        '-',
        'C2',
        'A2',
        'F2',
        'TD2',
        'TBB2',
        '-',
        'V5',
      ],
      Lab: [
        'L13',
        'L14',
        'L15',
        'L16',
        'L17',
        'L18',
        '-',
        'L43',
        'L44',
        'L45',
        'L46',
        'L47',
        'L48',
        '-',
      ],
    },
    Thursday: {
      Theory: [
        'D1',
        'B1',
        'G1',
        'TE1',
        'TCC1',
        '-',
        '-',
        'D2',
        'B2',
        'G2',
        'TE2',
        'TCC2',
        '-',
        'V6',
      ],
      Lab: [
        'L19',
        'L20',
        'L21',
        'L22',
        'L23',
        'L24',
        '-',
        'L49',
        'L50',
        'L51',
        'L52',
        'L53',
        'L54',
        '-',
      ],
    },
    Friday: {
      Theory: [
        'E1',
        'C1',
        'TA1',
        'TF1',
        'TD1',
        '-',
        '-',
        'E2',
        'C2',
        'TA2',
        'TF2',
        'TDD2',
        '-',
        'V7',
      ],
      Lab: [
        'L25',
        'L26',
        'L27',
        'L28',
        'L29',
        'L30',
        '-',
        'L55',
        'L56',
        'L57',
        'L58',
        'L59',
        'L60',
        '-',
      ],
    },
    Saturday: {
      Theory: [
        'V8',
        'X11',
        'X12',
        'Y11',
        'Y12',
        '-',
        '-',
        'X21',
        'Z21',
        'Y21',
        'W21',
        'W22',
        '-',
        'V9',
      ],
      Lab: [
        'L71',
        'L72',
        'L73',
        'L74',
        'L75',
        'L76',
        '-',
        'L77',
        'L78',
        'L79',
        'L80',
        'L81',
        'L82',
        '-',
      ],
    },
    Sunday: {
      Theory: [
        'V10',
        'Y11',
        'Y12',
        'X11',
        'X12',
        '-',
        '-',
        'Y21',
        'Z21',
        'X21',
        'W21',
        'W22',
        '-',
        'V11',
      ],
      Lab: [
        'L83',
        'L84',
        'L85',
        'L86',
        'L87',
        'L88',
        '-',
        'L89',
        'L90',
        'L91',
        'L92',
        'L93',
        'L94',
        '-',
      ],
    },
  };

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const getGridPositions = (
  slotString: string,
): { day: number; col: number }[] => {
  const positions: { day: number; col: number }[] = [];
  const individualSlots = slotString.split('+').map((s) => s.trim());

  DAYS.forEach((dayName, dayIdx) => {
    const dayConfig = CAMPUS_SLOTS[dayName];

    dayConfig.Theory.forEach((slot, colIdx) => {
      if (individualSlots.includes(slot))
        positions.push({ day: dayIdx, col: colIdx });
    });

    dayConfig.Lab.forEach((slot, colIdx) => {
      if (individualSlots.includes(slot))
        positions.push({ day: dayIdx, col: colIdx });
    });
  });
  return positions;
};

export const getCorrectDayName = (date: Date) => {
  const jsDay = date.getDay();
  // JS: 0=LightMode, 1=Mon...6=Sat
  // Our Array: 0=Mon, 5=Sat, 6=LightMode
  if (jsDay === 0) return 'Sunday';
  return DAYS[jsDay - 1];
};

export interface UpcomingClass {
  course: TimetableCourse;
  time: string;
  status: 'Now' | 'Next' | 'Later';
}

export const getUpcomingClasses = (
  courses: TimetableCourse[],
): UpcomingClass[] => {
  const now = new Date();
  const dayName = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][now.getDay()];
  const currentHour = now.getHours();

  if (!CAMPUS_SLOTS[dayName]) return [];

  const dayConfig = CAMPUS_SLOTS[dayName];
  const upcoming: UpcomingClass[] = [];

  const getHour = (col: number) => {
    if (col < 5) return 8 + col;
    if (col === 5) return 12;
    if (col === 6) return 13;
    if (col > 6) return 14 + (col - 7);
    return 19;
  };

  courses.forEach((course) => {
    const slots = course.slot.split('+').map((s) => s.trim());
    slots.forEach((slot) => {
      let col = dayConfig.Theory.indexOf(slot);
      if (col === -1) col = dayConfig.Lab.indexOf(slot);

      if (col !== -1) {
        const hour = getHour(col);
        if (hour >= currentHour) {
          upcoming.push({
            course,
            time: `${hour}:00`,
            status: hour === currentHour ? 'Now' : 'Next',
          });
        }
      }
    });
  });

  return upcoming
    .sort((a, b) => parseInt(a.time) - parseInt(b.time))
    .slice(0, 5);
};

export const getClassesForDate = (
  date: Date,
  ttCourses: TimetableCourse[],
  calEvent: any = null,
): UpcomingClass[] => {
  const jsDay = date.getDay();
  let dName =
    jsDay === 0
      ? 'Sunday'
      : [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ][jsDay - 1];

  let hasOverride = false;
  if (calEvent) {
    const lowerInfo = (calEvent.info || '').toLowerCase();
    const subInfo = (calEvent.subInfo || '').toLowerCase();
    const combined = lowerInfo + ' ' + subInfo;

    if (combined.includes('monday day order')) {
      dName = 'Monday';
      hasOverride = true;
    } else if (combined.includes('tuesday day order')) {
      dName = 'Tuesday';
      hasOverride = true;
    } else if (combined.includes('wednesday day order')) {
      dName = 'Wednesday';
      hasOverride = true;
    } else if (combined.includes('thursday day order')) {
      dName = 'Thursday';
      hasOverride = true;
    } else if (combined.includes('friday day order')) {
      dName = 'Friday';
      hasOverride = true;
    }
  }

  if (calEvent && !calEvent.isInstructional && !hasOverride) {
    return [];
  }

  if (!CAMPUS_SLOTS[dName as keyof typeof CAMPUS_SLOTS]) return [];
  const dayConfig = CAMPUS_SLOTS[dName as keyof typeof CAMPUS_SLOTS];

  const tempClasses: {
    course: any;
    startCol: number;
    endCol: number;
    type: 'Theory' | 'Lab';
  }[] = [];
  ttCourses.forEach((course) => {
    const slots = course.slot.split('+').map((s: string) => s.trim());
    slots.forEach((slot: string) => {
      let col = dayConfig.Theory.indexOf(slot);
      let type: 'Theory' | 'Lab' = 'Theory';

      if (col === -1) {
        col = dayConfig.Lab.indexOf(slot);
        type = 'Lab';
      }

      if (col !== -1 && CAMPUS_SLOT_TIMINGS[type][col]) {
        tempClasses.push({ course, startCol: col, endCol: col, type });
      }
    });
  });

  tempClasses.sort((a, b) => a.startCol - b.startCol);

  const mergedClasses: typeof tempClasses = [];
  tempClasses.forEach((curr) => {
    if (mergedClasses.length === 0) {
      mergedClasses.push(curr);
    } else {
      const last = mergedClasses[mergedClasses.length - 1];
      if (
        curr.course.title === last.course.title &&
        curr.type === last.type &&
        curr.startCol === last.endCol + 1
      ) {
        last.endCol = curr.endCol;
      } else {
        mergedClasses.push(curr);
      }
    }
  });

  const dayClasses: UpcomingClass[] = mergedClasses.map((m) => {
    return {
      course: m.course,
      time: `${CAMPUS_SLOT_TIMINGS[m.type][m.startCol].start} - ${CAMPUS_SLOT_TIMINGS[m.type][m.endCol].end}`,
      status: 'Next',
    };
  });

  return dayClasses;
};
