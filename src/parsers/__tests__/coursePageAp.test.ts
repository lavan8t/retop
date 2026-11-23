import { describe, expect, it } from 'bun:test';
import {
  parseApCourseDetail,
  parseApCourseOptions,
  parseApFacultyOptions,
  parseApSemesters,
  parseApSlotOptions,
  SCHEMA_VERSION,
} from '../course-page-ap';

const COURSES_HTML = `
<select id="courseCode" name="courseCode">
  <option value="">--Choose--</option>
  <option value="AP2026273000308">CSE1012 - Problem Solving using Python - ETH</option>
  <option value="AP2026273000310">CSE1013 - Data Structures and Algorithms - TH</option>
  <option value="AP2026273000312">CSE1014 - Digital Logic - LAB</option>
</select>`;

const SLOTS_HTML = `
<select id="slotId" name="slotId">
  <option value="">--Choose--</option>
  <option value="4058">B1+TB1</option>
  <option value="4059">B2+TB2</option>
</select>`;

const FACULTY_HTML = `
<select id="faculty" name="faculty">
  <option value="">--Choose--</option>
  <option value="F001">Dr. Smith</option>
  <option value="F002">Dr. Jones</option>
</select>`;

const DETAIL_HTML = `
<div id="collapseOutcome"><table><tbody>
  <tr><td>CO1</td><td>Understand Python</td></tr>
</tbody></table></div>
<div id="collapseModules"><table><tbody>
  <tr><td>M1 - Introduction</td><td>Topic A</td><td>L1</td></tr>
  <tr><td>Topic B</td><td>L2</td></tr>
</tbody></table></div>
<table id="materialTable"><tbody>
  <tr>
    <td>1</td>
    <td>2026-01-01</td>
    <td><span>Lecture 1</span><span>Intro</span><span>1 (Handout)</span></td>
    <td><span>Dr. Smith</span><span>02/01/2026</span></td>
    <td><button data-fileid="f1">Download</button></td>
  </tr>
</tbody></table>
<div id="collapseTextBook"><table><tbody>
  <tr><td>Textbooks</td><td>1. Python 101 2. Learning Python</td></tr>
</tbody></table></div>`;

const SHELL_HTML = `
<select id="semesterSubId" name="semesterSubId">
  <option value="">--Select Semester--</option>
  <option value="AP2026273" selected>Fall Semester 2026-27 Freshers</option>
  <option value="AP2026272">Spring Semester 2025-26 Regular</option>
</select>
<select id="courseCode">
  <option value="AP2026273000308">CSE1012 - Problem Solving using Python - ETH</option>
</select>`;

describe('parseApSemesters', () => {
  it('reads only select#semesterSubId options and marks the selected one latest', () => {
    expect(parseApSemesters(SHELL_HTML)).toEqual([
      {
        id: 'AP2026273',
        label: 'Fall Semester 2026-27 Freshers',
        isLatest: true,
      },
      {
        id: 'AP2026272',
        label: 'Spring Semester 2025-26 Regular',
        isLatest: false,
      },
    ]);
  });

  it('supports the name-only selector and defaults the first option to latest', () => {
    const html = `<select name="semesterSubId">
      <option value="AP1">One</option><option value="AP2">Two</option>
    </select>`;
    expect(parseApSemesters(html)).toEqual([
      { id: 'AP1', label: 'One', isLatest: true },
      { id: 'AP2', label: 'Two', isLatest: false },
    ]);
  });

  it('returns an empty list when no semester select exists', () => {
    expect(parseApSemesters(COURSES_HTML)).toEqual([]);
    expect(parseApSemesters('')).toEqual([]);
  });
});

describe('parseApCourseOptions', () => {
  it('maps select#courseCode options using value as classId and semSubId as semester', () => {
    expect(parseApCourseOptions(COURSES_HTML, 'AP2026273')).toEqual([
      {
        code: 'CSE1012',
        title: 'Problem Solving using Python',
        classId: 'AP2026273000308',
        semester: 'AP2026273',
        type: 'ETH',
        credits: '0',
        rawText: 'CSE1012 - Problem Solving using Python - ETH',
      },
      {
        code: 'CSE1013',
        title: 'Data Structures and Algorithms',
        classId: 'AP2026273000310',
        semester: 'AP2026273',
        type: 'TH',
        credits: '0',
        rawText: 'CSE1013 - Data Structures and Algorithms - TH',
      },
      {
        code: 'CSE1014',
        title: 'Digital Logic',
        classId: 'AP2026273000312',
        semester: 'AP2026273',
        type: 'LAB',
        credits: '0',
        rawText: 'CSE1014 - Digital Logic - LAB',
      },
    ]);
  });

  it('returns an empty list when the select is absent or only placeholders exist', () => {
    expect(parseApCourseOptions('<div>no select</div>', 'AP2026273')).toEqual(
      [],
    );
    expect(
      parseApCourseOptions(
        '<select id="courseCode"><option value="">--Choose--</option></select>',
        'AP2026273',
      ),
    ).toEqual([]);
  });
});

describe('parseApSlotOptions', () => {
  it('maps slot values and labels, skipping the placeholder', () => {
    expect(parseApSlotOptions(SLOTS_HTML)).toEqual([
      { id: '4058', label: 'B1+TB1' },
      { id: '4059', label: 'B2+TB2' },
    ]);
  });

  it('returns an empty list for unrelated fragments', () => {
    expect(parseApSlotOptions('<div>no slots</div>')).toEqual([]);
  });
});

describe('parseApFacultyOptions', () => {
  it('maps faculty values and labels, skipping the placeholder', () => {
    expect(parseApFacultyOptions(FACULTY_HTML)).toEqual([
      { id: 'F001', label: 'Dr. Smith' },
      { id: 'F002', label: 'Dr. Jones' },
    ]);
  });

  it('returns an empty list for unrelated fragments', () => {
    expect(parseApFacultyOptions('<div>no faculty</div>')).toEqual([]);
  });
});

describe('parseApCourseDetail', () => {
  it('reuses the existing detail selectors for outcomes, syllabus, materials and books', () => {
    expect(parseApCourseDetail(DETAIL_HTML)).toEqual({
      outcomes: [{ number: 'CO1', description: 'Understand Python' }],
      syllabus: [
        {
          number: 'M1',
          title: 'Introduction',
          topics: 'Topic A\nTopic B',
          blooms: 'L1',
        },
      ],
      materials: [
        {
          id: 'f1',
          index: '1',
          title: 'Lecture 1',
          category: 'Handout',
          faculty: 'Dr. Smith',
          uploadDate: '02/01/2026',
          downloadId: 'f1',
          module: '1',
        },
      ],
      books: ['Python 101', 'Learning Python'],
    });
  });

  it('returns empty arrays instead of throwing when the detail HTML differs', () => {
    expect(parseApCourseDetail('')).toEqual({
      outcomes: [],
      syllabus: [],
      materials: [],
      books: [],
    });
    expect(parseApCourseDetail('<div>unexpected AP markup</div>')).toEqual({
      outcomes: [],
      syllabus: [],
      materials: [],
      books: [],
    });
  });

  it('exposes a schema version', () => {
    expect(SCHEMA_VERSION).toBe(2);
  });
});
