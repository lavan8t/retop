import { z } from "zod";

export const GradesRangeSchema = z.object({
  S: z.string(),
  A: z.string(),
  B: z.string(),
  C: z.string(),
  D: z.string(),
  E: z.string(),
  F: z.string(),
});

export const GradeAssessmentSchema = z.object({
  title: z.string(),
  maxMark: z.string(),
  weightage: z.string(),
  status: z.string(),
  scoredMark: z.string(),
  weightageMark: z.string(),
});

export const GradeCourseSchema = z.object({
  code: z.string(),
  title: z.string(),
  type: z.string(),
  credits: z.string(),
  l: z.string(),
  p: z.string(),
  j: z.string(),
  c: z.string(),
  gradingType: z.string(),
  grandTotal: z.string(),
  grade: z.string(),
  courseId: z.string(),
  notIncludedInGpa: z.boolean(),
  classStrength: z.string().optional(),
  gradingStrength: z.string().optional(),
  mean: z.string().optional(),
  sd: z.string().optional(),
  gradesRange: GradesRangeSchema.optional(),
  assessments: z.array(GradeAssessmentSchema).optional(),
});

export const GradesDataSchema = z.object({
  gpa: z.string(),
  courses: z.array(GradeCourseSchema),
});

export type GradesRangeSchemaType = z.infer<typeof GradesRangeSchema>;
export type GradeAssessmentSchemaType = z.infer<typeof GradeAssessmentSchema>;
export type GradeCourseSchemaType = z.infer<typeof GradeCourseSchema>;
export type GradesDataSchemaType = z.infer<typeof GradesDataSchema>;
