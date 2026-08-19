import { z } from "zod";

export const SpotlightLinkItemSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  downloadId: z.string().optional(),
  isDownload: z.boolean().optional(),
  isExternal: z.boolean().optional(),
});

export const SpotlightCategoryGroupSchema = z.object({
  category: z.string(),
  items: z.array(SpotlightLinkItemSchema),
});

export const SpotlightCategoryGroupListSchema = z.array(SpotlightCategoryGroupSchema);

export type SpotlightLinkItemSchemaType = z.infer<typeof SpotlightLinkItemSchema>;
export type SpotlightCategoryGroupSchemaType = z.infer<typeof SpotlightCategoryGroupSchema>;
export type SpotlightCategoryGroupListSchemaType = z.infer<typeof SpotlightCategoryGroupListSchema>;
