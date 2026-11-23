import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { VTOPNetwork } from '../network';

describe('VTOP download forms', () => {
  const originalSubmit = HTMLFormElement.prototype.submit;
  let submitted: HTMLFormElement | null = null;

  const fields = (form: HTMLFormElement): Record<string, string> =>
    Object.fromEntries(
      [...form.querySelectorAll('input')].map((input) => [
        input.name,
        input.value,
      ]),
    );

  beforeEach(() => {
    submitted = null;
    HTMLFormElement.prototype.submit = function (this: HTMLFormElement) {
      submitted = this;
    };
  });

  afterEach(() => {
    HTMLFormElement.prototype.submit = originalSubmit;
  });

  it('posts courseCode to courseSyllabusDownload1 (the GET path 404s)', () => {
    const network = new VTOPNetwork('csrf-token', '26BEE7068');
    network.downloadSyllabus('BCSE301L');

    expect(submitted?.getAttribute('method')?.toUpperCase()).toBe('POST');
    expect(submitted?.getAttribute('action')).toBe(
      '/vtop/courseSyllabusDownload1',
    );
    expect(submitted?.getAttribute('target')).toBe('_blank');
    expect(fields(submitted!)).toEqual({
      _csrf: 'csrf-token',
      authorizedID: '26BEE7068',
      courseCode: 'BCSE301L',
    });
  });

  it('posts fileId to downloadCourseMaterialFacultyPdf', () => {
    const network = new VTOPNetwork('csrf-token', '26BEE7068');
    network.downloadCourseMaterial('2026019907');

    expect(submitted?.getAttribute('method')?.toUpperCase()).toBe('POST');
    expect(submitted?.getAttribute('action')).toBe(
      '/vtop/downloadCourseMaterialFacultyPdf',
    );
    expect(fields(submitted!)).toEqual({
      _csrf: 'csrf-token',
      authorizedID: '26BEE7068',
      fileId: '2026019907',
    });
  });
});
