import { describe, expect, it } from 'bun:test';
import { parseTimetable } from '../timetable';

const html = `
<table>
  <tr><th>Class Group</th><th>Course</th><th>L T P J C</th></tr>
  <tr>
    <td>1</td>
    <td>TH</td>
    <td>CSE101 - Data Structures ( Embedded Theory )</td>
    <td>3 0 0 0 3</td>
    <td>Core</td>
    <td>2026-1</td>
    <td>CLS1</td>
    <td>A1 - AB1-101</td>
    <td>Dr Rao - Professor</td>
    <td>100</td>
    <td>100</td>
    <td>Registered</td>
  </tr>
</table>`;

describe('timetable LTPJC values', () => {
  it('keeps the raw L T P J C cell alongside the credit value', () => {
    const [course] = parseTimetable(html);
    expect(course.ltpjc).toBe('3 0 0 0 3');
    expect(course.credits).toBe('3');
  });
});
