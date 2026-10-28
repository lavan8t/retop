import { describe, expect, it } from 'bun:test';
import { isStudentRegNo } from '../studentId';

describe('isStudentRegNo', () => {
  it('accepts VTOP student registration numbers', () => {
    expect(isStudentRegNo('22ABC1234')).toBe(true);
    expect(isStudentRegNo(' 21BCE9876 ')).toBe(true);
    expect(isStudentRegNo('22bce1234')).toBe(true);
  });

  it('rejects faculty IDs and malformed values', () => {
    expect(isStudentRegNo('12345')).toBe(false);
    expect(isStudentRegNo('22AB1234')).toBe(false);
    expect(isStudentRegNo('22ABCD1234')).toBe(false);
    expect(isStudentRegNo('ABC1234')).toBe(false);
    expect(isStudentRegNo('')).toBe(false);
    expect(isStudentRegNo(null)).toBe(false);
    expect(isStudentRegNo(undefined)).toBe(false);
  });
});
