import { describe, expect, it } from 'bun:test';
import {
  buildDownloadBody,
  buildDownloadFilename,
  isDownloadableMaterial,
  isPdfContentType,
  isVtopDownloadUrl,
  sanitizePathPart,
} from '../courseDownloads';

describe('course material bulk download planning', () => {
  it('sanitizes illegal filename characters and collapses whitespace', () => {
    expect(sanitizePathPart('  Intro: Lecture / Notes?  ')).toBe(
      'Intro_ Lecture _ Notes_',
    );
    expect(sanitizePathPart('')).toBe('Unnamed');
    expect(sanitizePathPart('   ')).toBe('Unnamed');
  });

  it('only matches VTOP download URLs, not other sites or lookalikes', () => {
    expect(isVtopDownloadUrl('https://vtop.vit.ac.in/vtop/x')).toBe(true);
    expect(isVtopDownloadUrl('https://vtopcc.vit.ac.in/vtop/x')).toBe(true);
    expect(isVtopDownloadUrl('https://getretop.web.app/x')).toBe(false);
    expect(isVtopDownloadUrl('https://evil.test/?u=vtop.vit.ac.in')).toBe(
      false,
    );
    expect(isVtopDownloadUrl(undefined)).toBe(false);
  });

  it('builds a module-wise folder path without changing the file extension', () => {
    const item = {
      fileId: 'f1',
      title: 'Lecture 1: Intro/Notes.pdf',
      faculty: '10234 - Dr. Ada',
      module: '2',
    };
    const ctx = {
      semester: 'VL20252601',
      course: 'CSE1001 - Intro to CS',
      moduleWise: true,
    };

    expect(buildDownloadFilename(item, ctx)).toBe(
      'retop/coursepage/VL20252601/CSE1001 - Intro to CS/10234 - Dr. Ada/Module 2/Lecture 1_ Intro_Notes.pdf',
    );
  });

  it('omits the module folder when module-wise is off or the module is missing', () => {
    const ctx = {
      semester: 'VL20252601',
      course: 'CSE1001 - Intro to CS',
      moduleWise: true,
    };
    const item = {
      fileId: 'f1',
      title: 'Notes',
      faculty: 'Dr. Ada',
      module: undefined,
    };

    expect(buildDownloadFilename(item, ctx)).toBe(
      'retop/coursepage/VL20252601/CSE1001 - Intro to CS/Dr. Ada/Notes.pdf',
    );
    expect(
      buildDownloadFilename(
        { ...item, module: '3' },
        { ...ctx, moduleWise: false },
      ),
    ).toBe(
      'retop/coursepage/VL20252601/CSE1001 - Intro to CS/Dr. Ada/Notes.pdf',
    );
  });

  it('builds the VTOP download POST body with all required fields', () => {
    const body = buildDownloadBody(
      'file-42',
      'csrf-token',
      '21BCE1234',
      'Wed, 18 Nov 2026 00:00:00 GMT',
    );

    expect([...body.keys()]).toEqual(['_csrf', 'authorizedID', 'fileId', 'x']);
    expect(body.get('_csrf')).toBe('csrf-token');
    expect(body.get('authorizedID')).toBe('21BCE1234');
    expect(body.get('fileId')).toBe('file-42');
    expect(body.get('x')).toBe('Wed, 18 Nov 2026 00:00:00 GMT');
  });

  it('skips web links but keeps downloadable materials', () => {
    expect(isDownloadableMaterial('Web Link')).toBe(false);
    expect(isDownloadableMaterial('Web Material')).toBe(false);
    expect(isDownloadableMaterial('Lecture Notes')).toBe(true);
    expect(isDownloadableMaterial('')).toBe(true);
  });

  it('accepts only PDF responses for download', () => {
    expect(isPdfContentType('application/pdf')).toBe(true);
    expect(isPdfContentType('application/pdf; charset=binary')).toBe(true);
    expect(isPdfContentType('text/html; charset=utf-8')).toBe(false);
    expect(isPdfContentType(null)).toBe(false);
  });
});
