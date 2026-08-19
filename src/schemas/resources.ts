import { z } from "zod";

export const OfficialResourceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  category: z.string(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  description: z.string().optional(),
});

export const OfficialResourcesListSchema = z.array(OfficialResourceItemSchema);
export const ResourcesListSchema = OfficialResourcesListSchema;

export type OfficialResourceItemSchemaType = z.infer<typeof OfficialResourceItemSchema>;
export type OfficialResourcesListSchemaType = z.infer<typeof OfficialResourcesListSchema>;
export type ResourceItemSchemaType = OfficialResourceItemSchemaType;
export type ResourcesListSchemaType = OfficialResourcesListSchemaType;
