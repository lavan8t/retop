import { z } from "zod";

export const AcademicStatsSchema = z.object({
  cgpa: z.string(),
  credits: z.string(),
  totalCredits: z.string(),
  nonGraded: z.string(),
  placement: z.string(),
});

export const DashboardCourseSummarySchema = z.object({
  code: z.string(),
  name: z.string(),
  type: z.string().optional(),
  slot: z.string(),
  faculty: z.string(),
  attendance: z.string(),
  attended: z.number().optional(),
  total: z.number().optional(),
});

export const DashboardAssignmentSchema = z.object({
  title: z.string(),
  course: z.string(),
  dueDate: z.string(),
  dueDateMs: z.number().optional(),
  status: z.string().optional(),
});

export const DashboardAssignmentsListSchema = z.array(DashboardAssignmentSchema);
export const DashboardCourseSummaryListSchema = z.array(DashboardCourseSummarySchema);

export type AcademicStatsSchemaType = z.infer<typeof AcademicStatsSchema>;
export type DashboardCourseSummarySchemaType = z.infer<typeof DashboardCourseSummarySchema>;
export type DashboardAssignmentSchemaType = z.infer<typeof DashboardAssignmentSchema>;
