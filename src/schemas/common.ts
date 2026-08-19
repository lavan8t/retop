import { z } from "zod";

export const QuickLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
  category: z.string(),
  subheading: z.string().optional(),
  icon: z.string().optional(),
});

export const SemesterSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const SchemaMetadataSchema = z.object({
  _schemaVersion: z.number().optional(),
  _parsedAt: z.number().optional(),
});

export type QuickLinkSchemaType = z.infer<typeof QuickLinkSchema>;
export type SemesterSchemaType = z.infer<typeof SemesterSchema>;
export type SchemaMetadataSchemaType = z.infer<typeof SchemaMetadataSchema>;
