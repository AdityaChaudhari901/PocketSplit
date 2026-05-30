import { z } from "zod";

import { currencyScale } from "@/lib/money";
import type { CurrencyCode } from "@/types/domain";

export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amountMajor: z
    .string()
    .min(1, "Amount is required.")
    .regex(/^\d+(\.\d{1,3})?$/, "Use a valid amount with supported decimals."),
  walletId: z.string().min(1, "Choose a wallet."),
  categoryId: z.string().min(1, "Choose a category."),
  tagIds: z.array(z.string()).default([]),
  merchant: z.string().max(80).optional(),
  note: z.string().max(180).optional(),
  occurredAt: z.string().min(1)
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const fractionDigitsForScale = (scale: number): number => Math.max(0, Math.round(Math.log10(scale)));

export const majorToMinor = (amountMajor: string, currencyOrScale: CurrencyCode | number = "INR"): number => {
  const normalizedAmount = amountMajor.trim();
  const scale = typeof currencyOrScale === "number" ? currencyOrScale : currencyScale(currencyOrScale);
  const fractionDigits = fractionDigitsForScale(scale);
  const amountPattern = fractionDigits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${fractionDigits}})?$`);

  if (!amountPattern.test(normalizedAmount)) {
    return 0;
  }

  const [whole = "0", fraction = ""] = normalizedAmount.split(".");
  return Number.parseInt(whole, 10) * scale + Number.parseInt(fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits) || "0", 10);
};

export const minorToMajorInput = (amountMinor: number, currencyOrScale: CurrencyCode | number = "INR"): string => {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return "";
  }

  const scale = typeof currencyOrScale === "number" ? currencyOrScale : currencyScale(currencyOrScale);
  const fractionDigits = fractionDigitsForScale(scale);
  const whole = Math.floor(amountMinor / scale);
  const fraction = amountMinor % scale;
  if (fraction === 0 || fractionDigits === 0) {
    return `${whole}`;
  }

  const normalizedFraction = `${fraction}`.padStart(fractionDigits, "0");
  return `${whole}.${normalizedFraction}`;
};
