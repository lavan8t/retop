import { z } from "zod";

export const AssessmentMarkSchema = z.object({
  title: z.string(),
  maxMark: z.string(),
  weightage: z.string(),
  scoredMark: z.string(),
  scoredPercentage: z.string(),
  status: z.string(),
});

export const CourseMarksSchema = z.object({
  code: z.string(),
  title: z.string(),
  type: z.string(),
  credits: z.string(),
  classNumber: z.string(),
  slot: z.string(),
  faculty: z.string(),
  assessments: z.array(AssessmentMarkSchema),
});

export const CourseMarksListSchema = z.array(CourseMarksSchema);

export type AssessmentMarkSchemaType = z.infer<typeof AssessmentMarkSchema>;
export type CourseMarksSchemaType = z.infer<typeof CourseMarksSchema>;
export type CourseMarksListSchemaType = z.infer<typeof CourseMarksListSchema>;
