import { describe, expect, it } from 'bun:test';
import { parseDAAssignments } from '../digital-assignments';

const row = ({
  sl,
  title,
  updated = '',
  activeCode = '',
  opt = '',
  downloadCode = '',
  submitWithoutCode = false,
}: {
  sl: string;
  title: string;
  updated?: string;
  activeCode?: string;
  opt?: string;
  downloadCode?: string;
  submitWithoutCode?: boolean;
}): string => {
  const active = activeCode
    ? `
      <input type="file" name="studDaUpload" />
      <input type="hidden" name="code" value="${activeCode}" />
      <input type="hidden" name="opt" value="${opt || title}" />
      <input type="hidden" name="mCode" value="${activeCode}" />
      <input type="hidden" name="classId" value="VL2026270103368" />
      <button type="button" name="digitalAssignmentSubmit" data-subcode="${activeCode}">Submit</button>`
    : submitWithoutCode
      ? `<button type="button" name="digitalAssignmentSubmit">Submit</button>`
      : '';

  return `
    <tr class="fixedContent tableContent">
      <td>${sl}</td>
      <td>${title}</td>
      <td>10</td>
      <td>10</td>
      <td>31-10-2026</td>
      <td></td>
      <td>${updated}</td>
      <td>${active}</td>
      <td>${
        downloadCode
          ? `<button type="button" name="downloadStudentDA" data-code="${downloadCode}" data-classid="VL2026270103368"></button>`
          : ''
      }</td>
    </tr>`;
};

const fixture = `
<table>
  <thead>
    <tr>
      <th>Sl.No.</th><th>Title</th><th>Max. Mark</th><th>Weightage %</th>
      <th>Due Date</th><th>QP</th><th>Last Updated On</th>
      <th>Upload/Edit</th><th>Download</th>
    </tr>
  </thead>
  <tbody>
    ${row({
      sl: '1',
      title: 'Lexical Analyzer -DA1',
      updated: '29 Jul 2026 11:16 AM',
      downloadCode: 'AST01',
    })}
    ${row({
      sl: '2',
      title: 'Review 3',
      updated: '31 Oct 2026 09:35 PM',
      activeCode: 'AST10',
      opt: 'Review 3',
      downloadCode: 'AST10',
    })}
    ${row({ sl: '3', title: 'Review 1' })}
    ${row({ sl: '4', title: 'Symbol table -DA4' })}
    ${row({ sl: '10', title: 'Target Code- DA7' })}
    ${row({
      sl: '11',
      title: 'Broken row with a submit button but no code',
      submitWithoutCode: true,
    })}
  </tbody>
</table>`;

describe('parseDAAssignments codes', () => {
  const parsed = parseDAAssignments(fixture);

  it('uses the row hidden code for the active upload row', () => {
    const review = parsed.find((a) => a.title === 'Review 3');
    expect(review?.code).toBe('AST10');
    expect(review?.opt).toBe('Review 3');
    expect(review?.canUpload).toBe(true);
  });

  it('uses data-code for rows that only expose a download button', () => {
    const da1 = parsed.find((a) => a.title === 'Lexical Analyzer -DA1');
    expect(da1?.code).toBe('AST01');
    expect(da1?.canUpload).toBe(false);
  });

  it('never invents a code from the title or serial number', () => {
    const unsubmitted = parsed.find((a) => a.title === 'Review 1');
    const da4 = parsed.find((a) => a.title === 'Symbol table -DA4');
    const da7 = parsed.find((a) => a.title === 'Target Code- DA7');

    expect(unsubmitted?.code).toBe('');
    expect(da4?.code).toBe('');
    expect(da7?.code).toBe('');
  });

  it('does not allow an upload without a resolvable code', () => {
    expect(parsed.find((a) => a.title === 'Review 1')?.canUpload).toBe(false);
    expect(parsed.every((a) => !a.canUpload || a.code.length > 0)).toBe(true);
  });
});
