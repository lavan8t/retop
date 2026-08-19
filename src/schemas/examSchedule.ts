import { z } from "zod";

export const ExamEntrySchema = z.object({
  slNo: z.string(),
  courseCode: z.string(),
  courseTitle: z.string(),
  courseType: z.string(),
  classId: z.string(),
  slot: z.string(),
  examDate: z.string(),
  examSession: z.string(),
  reportingTime: z.string(),
  examTime: z.string(),
  venue: z.string(),
  seatLocation: z.string(),
  seatNo: z.string(),
});

export const ExamGroupSchema = z.object({
  examType: z.string(),
  entries: z.array(ExamEntrySchema),
});

export const ExamScheduleListSchema = z.array(ExamGroupSchema);

export const ExamScheduleDataSchema = z.object({
  groups: ExamScheduleListSchema,
  reportingNote: z.string().optional(),
});

export type ExamEntrySchemaType = z.infer<typeof ExamEntrySchema>;
export type ExamGroupSchemaType = z.infer<typeof ExamGroupSchema>;
export type ExamScheduleListSchemaType = z.infer<typeof ExamScheduleListSchema>;
export type ExamScheduleDataSchemaType = z.infer<typeof ExamScheduleDataSchema>;
