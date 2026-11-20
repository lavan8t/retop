import { describe, expect, it } from 'bun:test';
import {
  extractCurriculumCategoryId,
  isLikelyCourseCode,
  parseCurriculumCategoryTable,
  parseCurriculumDashboard,
} from '../../parsers/curriculum';

describe('extractCurriculumCategoryId', () => {
  it('keeps the classic short uppercase ids', () => {
    expect(extractCurriculumCategoryId("showCategory('PCB')")).toBe('PCB');
    expect(extractCurriculumCategoryId('view("PE")')).toBe('PE');
  });

  it('accepts broader VTOP ids (digits, underscores, longer, lowercase)', () => {
    expect(extractCurriculumCategoryId("viewCategory('21BCE')")).toBe('21BCE');
    expect(extractCurriculumCategoryId("viewCategory('CSE_1')")).toBe('CSE_1');
    expect(extractCurriculumCategoryId("viewCategory('PROFCORE2')")).toBe(
      'PROFCORE2',
    );
    expect(extractCurriculumCategoryId("viewCategory('oe')")).toBe('OE');
  });

  it('returns null when there is no id-like token', () => {
    expect(extractCurriculumCategoryId('doNothing()')).toBeNull();
    expect(extractCurriculumCategoryId("pick('2024')")).toBeNull();
    expect(extractCurriculumCategoryId('')).toBeNull();
  });
});

describe('isLikelyCourseCode', () => {
  it('accepts classic and broader VTOP course codes', () => {
    expect(isLikelyCourseCode('CSE1001')).toBe(true);
    expect(isLikelyCourseCode('MATH1001')).toBe(true);
    expect(isLikelyCourseCode('CS101')).toBe(true);
    expect(isLikelyCourseCode('BIO1001P')).toBe(true);
    expect(isLikelyCourseCode('21BCE1234')).toBe(true);
  });

  it('rejects serial numbers, titles and partial codes', () => {
    expect(isLikelyCourseCode('1')).toBe(false);
    expect(isLikelyCourseCode('1234')).toBe(false);
    expect(isLikelyCourseCode('CSE')).toBe(false);
    expect(isLikelyCourseCode('Introduction to CS')).toBe(false);
    expect(isLikelyCourseCode('')).toBe(false);
  });
});

describe('parseCurriculumDashboard category ids', () => {
  it('parses categories whose ids contain digits and are longer than 4 chars', () => {
    const html = `
      <div onclick="viewCategory('21BCE')">
        <div class="col-6"><span>Professional Core</span></div>
        <div class="text-right"><span>12 / 16</span></div>
      </div>
      <div onclick="viewCategory('OELONG2')">
        <div class="col-6"><span>Open Elective</span></div>
        <div class="text-right"><span>3 / 6</span></div>
      </div>
    `;
    const data = parseCurriculumDashboard(html);
    expect(data.categories.map((c) => c.id)).toEqual(['21BCE', 'OELONG2']);
    expect(data.categories[0].credits).toBe('12');
    expect(data.categories[0].maxCredits).toBe('16');
  });
});

describe('parseCurriculumCategoryTable robustness', () => {
  it('parses a broader code in a short (3-cell) row', () => {
    const html = `
      <table>
        <tr><td>1</td><td>21BCE1234</td><td>Data Structures</td></tr>
      </table>
    `;
    const data = parseCurriculumCategoryTable(html);
    expect(data.courses).toHaveLength(1);
    expect(data.courses[0].code).toBe('21BCE1234');
    expect(data.courses[0].title).toBe('Data Structures');
    expect(data.courses[0].credits).toBe('0');
  });

  it('still parses a standard 8-cell course row', () => {
    const html = `
      <table>
        <tr>
          <td>1</td><td>CSE1001</td><td>Intro to CS</td><td>TH</td>
          <td>4</td><td>3</td><td>0</td><td>0</td><td>0</td>
        </tr>
      </table>
    `;
    const data = parseCurriculumCategoryTable(html);
    expect(data.courses).toHaveLength(1);
    expect(data.courses[0].code).toBe('CSE1001');
    expect(data.courses[0].credits).toBe('4');
    expect(data.courses[0].l).toBe('3');
  });
});
