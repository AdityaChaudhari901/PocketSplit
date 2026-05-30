import { z } from "zod";

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const CATEGORY_TAG_NAME_REGEX = /^[A-Za-z0-9 _-]+$/;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(50, "Name must be 50 characters or fewer.")
  .regex(CATEGORY_TAG_NAME_REGEX, "Use only letters, numbers, spaces, dash, or underscore.");

export const categoryFormSchema = z.object({
  name: nameSchema,
  color: z.string().trim().regex(HEX_COLOR_REGEX, "Use a valid hex color.").optional().or(z.literal("")),
  icon: z.string().trim().min(1, "Choose an icon.").max(40, "Icon id is too long."),
  kind: z.enum(["income", "expense"])
});

export const tagFormSchema = z.object({
  name: nameSchema,
  color: z.string().trim().regex(HEX_COLOR_REGEX, "Use a valid hex color.").optional().or(z.literal(""))
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type TagFormValues = z.infer<typeof tagFormSchema>;
