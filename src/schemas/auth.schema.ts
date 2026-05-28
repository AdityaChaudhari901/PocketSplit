import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters.")
});

export type AuthFormValues = z.infer<typeof authSchema>;
