import { z } from "zod";

export const CurriculumCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
  credits: z.string(),
  maxCredits: z.string(),
  isCompleted: z.boolean(),
});

export const CurriculumCourseSchema = z.object({
  sl: z.string(),
  code: z.string(),
  title: z.string(),
  type: z.string(),
  credits: z.string(),
  l: z.string(),
  t: z.string(),
  p: z.string(),
  j: z.string(),
  basket: z.string(),
  isCompleted: z.boolean().optional(),
});

export const CurriculumDashboardSchema = z.object({
  totalCredits: z.string(),
  categories: z.array(CurriculumCategorySchema),
});

export type CurriculumCategorySchemaType = z.infer<typeof CurriculumCategorySchema>;
export type CurriculumCourseSchemaType = z.infer<typeof CurriculumCourseSchema>;
export type CurriculumDashboardSchemaType = z.infer<typeof CurriculumDashboardSchema>;
