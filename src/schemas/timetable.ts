import { z } from "zod";

export const TimetableCourseSchema = z.object({
  code: z.string(),
  title: z.string(),
  type: z.string(),
  credits: z.string(),
  category: z.string(),
  slot: z.string(),
  venue: z.string(),
  faculty: z.string(),
  classId: z.string(),
  status: z.string(),
});

export const TimetableListSchema = z.array(TimetableCourseSchema);

export const ParsedTimetableSchema = z.object({
  courses: z.array(TimetableCourseSchema),
  academicYear: z.string().optional(),
});

export type TimetableCourseSchemaType = z.infer<typeof TimetableCourseSchema>;
export type TimetableListSchemaType = z.infer<typeof TimetableListSchema>;
export type ParsedTimetableSchemaType = z.infer<typeof ParsedTimetableSchema>;
