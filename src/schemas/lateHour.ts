import { z } from "zod";

export const LateHourStatusEntrySchema = z.object({
  id: z.string(),
  venue: z.string(),
  eventType: z.string(),
  details: z.string(),
  appliedTo: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  time: z.string(),
  status: z.string(),
});

export const LateHourStatusListSchema = z.array(LateHourStatusEntrySchema);

export const LateHourResponseMsgSchema = z.object({
  ok: z.boolean(),
  text: z.string(),
});

export type LateHourStatusEntrySchemaType = z.infer<typeof LateHourStatusEntrySchema>;
export type LateHourStatusListSchemaType = z.infer<typeof LateHourStatusListSchema>;
export type LateHourResponseMsgSchemaType = z.infer<typeof LateHourResponseMsgSchema>;
