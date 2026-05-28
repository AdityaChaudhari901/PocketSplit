import { z } from "zod";

export const aiCategorizationSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(8).max(500)
});

export const aiSpendingInsightSchema = z.object({
  title: z.string().min(3).max(80),
  summary: z.string().min(12).max(600),
  mainDrivers: z.array(z.string().min(1)).max(6),
  suggestions: z.array(z.string().min(1)).max(6),
  riskLevel: z.enum(["low", "medium", "high"])
});

export const aiReceiptItemSchema = z.object({
  label: z.string().min(1),
  quantity: z.number().positive(),
  amountMinor: z.number().int().nonnegative()
});

export const aiReceiptParseSchema = z.object({
  merchant: z.string().min(1).optional(),
  date: z.string().optional(),
  items: z.array(aiReceiptItemSchema),
  taxAmountMinor: z.number().int().nonnegative().default(0),
  serviceChargeMinor: z.number().int().nonnegative().default(0),
  totalAmountMinor: z.number().int().positive(),
  suggestedCategory: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const aiAssistantResponseSchema = z.object({
  answer: z.string().min(16).max(1200),
  suggestedActions: z.array(z.string().min(1)).max(5),
  confidence: z.number().min(0).max(1),
  disclaimer: z.literal("Educational spending insight, not financial advice.")
});

export type AiCategorization = z.infer<typeof aiCategorizationSchema>;
export type AiSpendingInsight = z.infer<typeof aiSpendingInsightSchema>;
export type AiReceiptParse = z.infer<typeof aiReceiptParseSchema>;
export type AiAssistantResponse = z.infer<typeof aiAssistantResponseSchema>;
