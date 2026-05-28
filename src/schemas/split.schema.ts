import { z } from "zod";

import { isSupportedCurrencyCode } from "@/lib/currencies";

export const createGroupSchema = z.object({
  name: z.string().min(2, "Group name is required.").max(80),
  description: z.string().max(180).optional(),
  type: z.enum(["trip", "roommates", "couple", "family", "office", "event", "business", "other"]),
  currency: z.string().length(3).refine(isSupportedCurrencyCode, "Choose a supported currency."),
  budgetMajor: z.string().regex(/^\d+(\.\d{1,3})?$/, "Use a valid budget.").optional(),
  membersCsv: z.string().min(2, "Add at least one member.")
});

export const splitExpenseSchema = z.object({
  title: z.string().min(2).max(100),
  amountMajor: z.string().regex(/^\d+(\.\d{1,3})?$/, "Use a valid amount."),
  paidByMemberId: z.string().min(1),
  splitMethod: z.enum(["equal", "exact", "percentage", "shares", "itemwise", "custom"])
});

export type CreateGroupValues = z.infer<typeof createGroupSchema>;
export type SplitExpenseValues = z.infer<typeof splitExpenseSchema>;
