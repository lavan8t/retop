import { describe, expect, it } from 'bun:test';
import { isStudentPhotoSrc } from '../profile';

// VTOP serves the student's own photo inside the proctor section whenever the
// faculty member has no image on file. Either as a path, or as the byte-identical
// inlined data URI. Both must be rejected or the proctor card shows the student.
//
// The parser itself needs a real DOM and is covered by scripts/verify-proctor-photo.ts,
// which runs these same cases inside Chromium.
const STUDENT_URI = `data:image/jpeg;base64,${'A'.repeat(200)}`;
const FACULTY_URI = `data:image/jpeg;base64,${'F'.repeat(200)}`;

describe('isStudentPhotoSrc', () => {
  it('rejects identifiable student photo paths', () => {
    expect(isStudentPhotoSrc('/vtop/users/image/studentPhoto?id=X')).toBe(true);
    expect(isStudentPhotoSrc('users/image/studentPhoto?id=X')).toBe(true);
    expect(
      isStudentPhotoSrc('https://vtop.vit.ac.in/vtop/users/image/studentPhoto'),
    ).toBe(true);
  });

  it('rejects the byte-identical inlined student photo', () => {
    expect(isStudentPhotoSrc(STUDENT_URI, STUDENT_URI)).toBe(true);
  });

  it('keeps genuine faculty sources', () => {
    expect(isStudentPhotoSrc(FACULTY_URI, STUDENT_URI)).toBe(false);
    expect(isStudentPhotoSrc('users/image/staffPhoto?id=X', STUDENT_URI)).toBe(
      false,
    );
    expect(
      isStudentPhotoSrc('/vtop/users/image/staffPhoto?id=X', STUDENT_URI),
    ).toBe(false);
    expect(
      isStudentPhotoSrc('data:image/jpeg;base64,/9j/4AAQSkZJRg==', undefined),
    ).toBe(false);
  });

  it('tolerates empty and missing input', () => {
    expect(isStudentPhotoSrc('', STUDENT_URI)).toBe(false);
    expect(isStudentPhotoSrc(null)).toBe(false);
    expect(isStudentPhotoSrc(undefined)).toBe(false);
  });

  it('does not treat two empty placeholders as the same image', () => {
    // Without the length floor these collide and blank a real faculty photo.
    expect(isStudentPhotoSrc('ab', 'ab')).toBe(false);
  });
});
