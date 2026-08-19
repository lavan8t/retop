import { z } from "zod";

export const DACourseSchema = z.object({
  classId: z.string(),
  code: z.string(),
  title: z.string(),
  type: z.string(),
  faculty: z.string(),
});

export const DAAssignmentSchema = z.object({
  slNo: z.string(),
  title: z.string(),
  maxMark: z.string(),
  weightage: z.string(),
  dueDate: z.string(),
  lastUpdated: z.string(),
  code: z.string(),
  hasQP: z.boolean().optional(),
  canUpload: z.boolean().optional(),
  canDownloadSubmission: z.boolean().optional(),
});

export const DACourseListSchema = z.array(DACourseSchema);
export const DAAssignmentListSchema = z.array(DAAssignmentSchema);

export type DACourseSchemaType = z.infer<typeof DACourseSchema>;
export type DAAssignmentSchemaType = z.infer<typeof DAAssignmentSchema>;
export type DACourseListSchemaType = z.infer<typeof DACourseListSchema>;
export type DAAssignmentListSchemaType = z.infer<typeof DAAssignmentListSchema>;
