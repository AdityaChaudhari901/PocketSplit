import { daysRemainingInMonth } from "@/lib/dates";
import { getCurrencyMinorUnit } from "@/lib/currencies";
import type { CurrencyCode, MoneyPulseStatus } from "@/types/domain";

export interface MoneyValue {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface BudgetUsage {
  spentMinor: number;
  budgetMinor: number;
  remainingMinor: number;
  percentage: number;
  status: "safe" | "watch" | "over";
}

export interface MonthlySpendPlanInput {
  incomeMinor: number;
  expenseMinor: number;
  expectedBillsMinor?: number;
  allocatedSpendMinor?: number | null;
}

export interface MonthlySpendPlan {
  allocatedSpendMinor: number;
  committedSpendMinor: number;
  spendRemainingMinor: number;
  plannedSavingsMinor: number;
  overspendMinor: number;
  hasSpendAllocation: boolean;
}

export const assertMinorUnit = (amountMinor: number): void => {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Money amounts must be safe integers in minor units.");
  }
};

export const currencyScale = (currency: CurrencyCode): number =>
  10 ** getCurrencyMinorUnit(currency);

export const formatMoney = (amountMinor: number, currency: CurrencyCode = "INR"): string => {
  assertMinorUnit(amountMinor);
  const value = amountMinor / currencyScale(currency);
  const fractionDigits = getCurrencyMinorUnit(currency);
  const numberFormatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: fractionDigits === 0 ? 0 : undefined,
    maximumFractionDigits: fractionDigits
  };

  try {
    return new Intl.NumberFormat("en-IN", {
      ...numberFormatOptions,
      style: "currency",
      currency
    }).format(value);
  } catch {
    return `${currency} ${new Intl.NumberFormat("en-IN", numberFormatOptions).format(value)}`;
  }
};

const assertSameCurrency = (left: MoneyValue, right: MoneyValue): void => {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} cannot be combined with ${right.currency}.`);
  }
};

export const addMoney = (left: MoneyValue, right: MoneyValue): MoneyValue => {
  assertSameCurrency(left, right);
  assertMinorUnit(left.amountMinor);
  assertMinorUnit(right.amountMinor);
  return { amountMinor: left.amountMinor + right.amountMinor, currency: left.currency };
};

export const subtractMoney = (left: MoneyValue, right: MoneyValue): MoneyValue => {
  assertSameCurrency(left, right);
  assertMinorUnit(left.amountMinor);
  assertMinorUnit(right.amountMinor);
  return { amountMinor: left.amountMinor - right.amountMinor, currency: left.currency };
};

export const calculateBudgetUsage = (spentMinor: number, budgetMinor: number): BudgetUsage => {
  assertMinorUnit(spentMinor);
  assertMinorUnit(budgetMinor);
  if (budgetMinor <= 0) {
    return {
      spentMinor,
      budgetMinor,
      remainingMinor: 0,
      percentage: 0,
      status: "safe"
    };
  }

  const percentage = Math.round((spentMinor / budgetMinor) * 100);
  const remainingMinor = budgetMinor - spentMinor;

  return {
    spentMinor,
    budgetMinor,
    remainingMinor,
    percentage,
    status: percentage >= 100 ? "over" : percentage >= 80 ? "watch" : "safe"
  };
};

export const calculateMonthlySpendPlan = ({
  incomeMinor,
  expenseMinor,
  expectedBillsMinor = 0,
  allocatedSpendMinor
}: MonthlySpendPlanInput): MonthlySpendPlan => {
  [incomeMinor, expenseMinor, expectedBillsMinor].forEach(assertMinorUnit);
  if (allocatedSpendMinor !== null && allocatedSpendMinor !== undefined) {
    assertMinorUnit(allocatedSpendMinor);
  }

  const hasSpendAllocation = allocatedSpendMinor !== null && allocatedSpendMinor !== undefined && allocatedSpendMinor > 0;
  const resolvedAllocationMinor = hasSpendAllocation ? allocatedSpendMinor : incomeMinor;
  const committedSpendMinor = expenseMinor + expectedBillsMinor;

  return {
    allocatedSpendMinor: resolvedAllocationMinor,
    committedSpendMinor,
    spendRemainingMinor: Math.max(0, resolvedAllocationMinor - committedSpendMinor),
    plannedSavingsMinor: Math.max(0, incomeMinor - resolvedAllocationMinor),
    overspendMinor: Math.max(0, committedSpendMinor - resolvedAllocationMinor),
    hasSpendAllocation
  };
};

export const calculateSafeDailySpend = ({
  availableMinor,
  expectedBillsMinor = 0,
  today = new Date()
}: {
  availableMinor: number;
  expectedBillsMinor?: number;
  today?: Date;
}): number => {
  assertMinorUnit(availableMinor);
  assertMinorUnit(expectedBillsMinor);
  const spendableMinor = Math.max(0, availableMinor - expectedBillsMinor);
  return Math.floor(spendableMinor / daysRemainingInMonth(today));
};

export const calculateMoneyPulse = ({
  incomeMinor,
  expenseMinor,
  budgetMinor,
  recurringBillsMinor = 0,
  savingsTargetMinor = 0
}: {
  incomeMinor: number;
  expenseMinor: number;
  budgetMinor: number;
  recurringBillsMinor?: number;
  savingsTargetMinor?: number;
}): MoneyPulseStatus => {
  [incomeMinor, expenseMinor, budgetMinor, recurringBillsMinor, savingsTargetMinor].forEach(assertMinorUnit);

  if (incomeMinor > 0 && recurringBillsMinor / incomeMinor >= 0.45) {
    return "bill_heavy_month";
  }

  if (budgetMinor > 0 && expenseMinor > budgetMinor) {
    return "overspending";
  }

  const targetRemaining = incomeMinor - expenseMinor - savingsTargetMinor;
  if (savingsTargetMinor > 0 && targetRemaining >= 0) {
    return "saving_mode";
  }

  if (budgetMinor > 0 && expenseMinor / budgetMinor >= 0.8) {
    return "caution";
  }

  return "healthy";
};

export const pulseLabel = (status: MoneyPulseStatus): string => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "caution":
      return "Caution";
    case "overspending":
      return "Overspending";
    case "saving_mode":
      return "Saving Mode";
    case "bill_heavy_month":
      return "Bill Heavy Month";
  }
};
