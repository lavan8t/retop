import { z } from "zod";

export const CoursePageOptionSchema = z.object({
  code: z.string(),
  title: z.string(),
  classId: z.string(),
  semester: z.string(),
  type: z.string(),
  credits: z.string(),
  rawText: z.string(),
});

export const CourseMaterialSchema = z.object({
  id: z.string(),
  index: z.string(),
  title: z.string(),
  category: z.string(),
  faculty: z.string(),
  uploadDate: z.string(),
  downloadId: z.string(),
  module: z.string().optional(),
});

export const CourseOutcomeSchema = z.object({
  number: z.string(),
  description: z.string(),
});

export const SyllabusModuleSchema = z.object({
  number: z.string(),
  title: z.string(),
  topics: z.string(),
  blooms: z.string().optional(),
});

export const CoursePageDataSchema = z.object({
  options: z.array(CoursePageOptionSchema),
  selectedCourseId: z.string().nullable(),
  outcomes: z.array(CourseOutcomeSchema),
  syllabus: z.array(SyllabusModuleSchema),
  materials: z.array(CourseMaterialSchema),
  books: z.array(z.string()).optional(),
});

export type CoursePageOptionSchemaType = z.infer<typeof CoursePageOptionSchema>;
export type CourseMaterialSchemaType = z.infer<typeof CourseMaterialSchema>;
export type CourseOutcomeSchemaType = z.infer<typeof CourseOutcomeSchema>;
export type SyllabusModuleSchemaType = z.infer<typeof SyllabusModuleSchema>;
export type CoursePageDataSchemaType = z.infer<typeof CoursePageDataSchema>;
