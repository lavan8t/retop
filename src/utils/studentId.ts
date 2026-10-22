/**
 * VTOP registration numbers: 2-digit year, 3-letter programme, 4-digit roll.
 * Anything else belongs to faculty, staff, parent or alumni accounts.
 */
export const isStudentRegNo = (value: string | null | undefined): boolean =>
  /^\d{2}[A-Z]{3}\d{4}$/.test((value ?? "").trim().toUpperCase());
