import { z } from "zod";

export const EventSchema = z.object({
  title: z.string(),
  category: z.string(),
  date: z.string(),
  organizer: z.string(),
});

export const EventsListSchema = z.array(EventSchema);

export type EventSchemaType = z.infer<typeof EventSchema>;
export type EventsListSchemaType = z.infer<typeof EventsListSchema>;
