import { z } from "zod";
import { QuickLinkSchema } from "./common";

export const MenuCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
  links: z.array(QuickLinkSchema),
});

export const MenuCategoriesListSchema = z.array(MenuCategorySchema);

export const UserProfileHeaderSchema = z.object({
  name: z.string(),
  regNo: z.string(),
  profileImgBase64: z.string().optional(),
  campus: z.enum(["Chennai", "Vellore"]),
});

export type MenuCategorySchemaType = z.infer<typeof MenuCategorySchema>;
export type MenuCategoriesListSchemaType = z.infer<typeof MenuCategoriesListSchema>;
export type UserProfileHeaderSchemaType = z.infer<typeof UserProfileHeaderSchema>;
