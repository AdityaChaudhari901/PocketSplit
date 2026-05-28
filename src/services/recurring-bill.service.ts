import { endOfMonthISO, startOfMonthISO } from "@/lib/dates";
import type { CurrencyCode, RecurringBill, RecurringFrequency, RecurringBillStatus } from "@/types/domain";

export interface RecurringBillInput {
  ownerId: string;
  name: string;
  amountMinor: number;
  currency: CurrencyCode;
  categoryId: string;
  walletId?: string | null;
  frequency: RecurringFrequency;
  nextDueAt: string;
  remindDaysBefore: number;
  autoCreateExpense: boolean;
  merchant?: string | null;
  note?: string | null;
}

export interface UpcomingBill {
  bill: RecurringBill;
  dueAt: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

const MS_PER_DAY = 86_400_000;

const addMonthsClamped = (date: Date, months: number): Date => {
  const sourceDay = date.getDate();
  const next = new Date(date);
  next.setMonth(date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(sourceDay, lastDay));
  return next;
};

export const addFrequency = (date: Date, frequency: RecurringFrequency): Date => {
  switch (frequency) {
    case "weekly":
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
    case "monthly":
      return addMonthsClamped(date, 1);
    case "quarterly":
      return addMonthsClamped(date, 3);
    case "yearly":
      return addMonthsClamped(date, 12);
  }
};

export const daysUntil = (dueAt: string, today = new Date()): number => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(dueAt);
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.ceil((dueStart.getTime() - start.getTime()) / MS_PER_DAY);
};

export const createRecurringBill = (input: RecurringBillInput, id = `bill-${Date.now()}`): RecurringBill => {
  if (!input.name.trim()) {
    throw new Error("Bill name is required.");
  }

  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Bill amount must be a positive minor-unit integer.");
  }

  if (!input.categoryId) {
    throw new Error("Bill category is required.");
  }

  const dueDate = new Date(input.nextDueAt);
  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Bill due date is invalid.");
  }

  const now = new Date().toISOString();
  return {
    id,
    ownerId: input.ownerId,
    name: input.name.trim(),
    amountMinor: input.amountMinor,
    currency: input.currency,
    categoryId: input.categoryId,
    walletId: input.walletId ?? null,
    frequency: input.frequency,
    nextDueAt: dueDate.toISOString(),
    remindDaysBefore: Math.max(0, Math.floor(input.remindDaysBefore)),
    autoCreateExpense: input.autoCreateExpense,
    status: "active",
    merchant: input.merchant?.trim() || null,
    note: input.note?.trim() || null,
    createdAt: now,
    updatedAt: now,
    createdBy: input.ownerId,
    updatedBy: input.ownerId
  };
};

export const updateRecurringBillStatus = (
  bill: RecurringBill,
  status: RecurringBillStatus,
  updatedAt = new Date().toISOString()
): RecurringBill => ({
  ...bill,
  status,
  updatedAt,
  updatedBy: bill.ownerId
});

export const markRecurringBillPaid = (bill: RecurringBill, paidAt = new Date()): RecurringBill => ({
  ...bill,
  lastPaidAt: paidAt.toISOString(),
  nextDueAt: addFrequency(new Date(bill.nextDueAt), bill.frequency).toISOString(),
  updatedAt: paidAt.toISOString(),
  updatedBy: bill.ownerId
});

export const getUpcomingBills = (
  bills: RecurringBill[],
  options: {
    today?: Date;
    horizonDays?: number;
    includeOverdue?: boolean;
  } = {}
): UpcomingBill[] => {
  const today = options.today ?? new Date();
  const horizonDays = options.horizonDays ?? 30;
  const includeOverdue = options.includeOverdue ?? true;

  return bills
    .filter((bill) => bill.status === "active")
    .map((bill) => {
      const remainingDays = daysUntil(bill.nextDueAt, today);
      return {
        bill,
        dueAt: bill.nextDueAt,
        daysUntilDue: remainingDays,
        isOverdue: remainingDays < 0
      };
    })
    .filter((upcoming) => (includeOverdue || !upcoming.isOverdue) && upcoming.daysUntilDue <= horizonDays)
    .sort((left, right) => left.daysUntilDue - right.daysUntilDue);
};

export const getExpectedBillsMinorForMonth = (bills: RecurringBill[], today = new Date()): number => {
  const monthStart = new Date(startOfMonthISO(today));
  const monthEnd = new Date(endOfMonthISO(today));

  return bills
    .filter((bill) => bill.status === "active")
    .filter((bill) => {
      const dueAt = new Date(bill.nextDueAt);
      return dueAt >= monthStart && dueAt <= monthEnd;
    })
    .reduce((total, bill) => total + bill.amountMinor, 0);
};
