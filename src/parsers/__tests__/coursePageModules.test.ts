import { describe, expect, it } from 'bun:test';
import { parseCoursePage } from '../course-page';

const CONSOLIDATED_MODULES = `
<table id="moduleTable">
  <thead><tr>
    <th>Module No</th><th>Module Name</th><th>Topics</th><th>Bloom's Level</th>
  </tr></thead>
  <tbody>
    <tr><td>1</td><td>Programming Fundamentals</td>
        <td>Variables and types<br>Control flow</td><td>Remember</td></tr>
    <tr><td>2</td><td>Data Structures</td>
        <td>Arrays<br>Linked lists</td><td>Apply</td></tr>
  </tbody>
</table>`;

describe('consolidated course-page module table', () => {
  it('parses four-column module rows without a #collapseModules wrapper', () => {
    const result = parseCoursePage(CONSOLIDATED_MODULES);
    expect(result.syllabus).toEqual([
      {
        number: '1',
        title: 'Programming Fundamentals',
        topics: 'Variables and types\nControl flow',
        blooms: 'Remember',
      },
      {
        number: '2',
        title: 'Data Structures',
        topics: 'Arrays\nLinked lists',
        blooms: 'Apply',
      },
    ]);
  });

  it('keeps legacy inline-title module rows and topic continuations', () => {
    const result = parseCoursePage(`
      <div id="collapseModules"><table><tbody>
        <tr><td>M1 - Intro</td><td>Topic A</td><td>L1</td></tr>
        <tr><td>Topic B</td><td>L2</td></tr>
      </tbody></table></div>`);
    expect(result.syllabus).toEqual([
      {
        number: 'M1',
        title: 'Intro',
        topics: 'Topic A\nTopic B',
        blooms: 'L1',
      },
    ]);
  });
});
