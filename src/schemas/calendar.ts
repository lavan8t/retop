import { z } from "zod";

export const CalendarEventSchema = z.object({
  dayNumber: z.string(),
  info: z.string(),
  subInfo: z.string(),
  isHoliday: z.boolean(),
  isInstructional: z.boolean(),
  isExam: z.boolean(),
  dateObj: z.date(),
});

export const CalendarMonthPreviewSchema = z.object({
  label: z.string(),
  dateString: z.string(),
});

export const ClassGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const CalendarEventsListSchema = z.array(CalendarEventSchema);

export type CalendarEventSchemaType = z.infer<typeof CalendarEventSchema>;
export type CalendarMonthPreviewSchemaType = z.infer<typeof CalendarMonthPreviewSchema>;
export type ClassGroupSchemaType = z.infer<typeof ClassGroupSchema>;
export type CalendarEventsListSchemaType = z.infer<typeof CalendarEventsListSchema>;
