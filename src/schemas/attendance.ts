import { z } from "zod";

export const DetailedAttendanceCourseSchema = z.object({
  slNo: z.string(),
  courseCode: z.string(),
  courseTitle: z.string(),
  courseType: z.string(),
  classDetail: z.string(),
  faculty: z.string(),
  attended: z.number(),
  total: z.number(),
  percentage: z.number(),
  debarStatus: z.string(),
  semesterSubId: z.string(),
  courseId: z.string(),
  classType: z.string(),
});

export const AttendanceRecordSchema = z.object({
  slNo: z.string(),
  date: z.string(),
  slot: z.string(),
  dayTime: z.string(),
  status: z.string(),
});

export const AttendanceListSchema = z.array(DetailedAttendanceCourseSchema);

export type DetailedAttendanceCourseSchemaType = z.infer<typeof DetailedAttendanceCourseSchema>;
export type AttendanceRecordSchemaType = z.infer<typeof AttendanceRecordSchema>;
export type AttendanceListSchemaType = z.infer<typeof AttendanceListSchema>;
