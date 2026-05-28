import type { CurrencyCode, SavingsGoal, SavingsGoalContribution, SavingsGoalStatus } from "@/types/domain";

export interface SavingsGoalInput {
  ownerId: string;
  name: string;
  targetAmountMinor: number;
  savedAmountMinor?: number;
  currency: CurrencyCode;
  targetDate: string;
  monthlyContributionMinor: number;
  note?: string | null;
}

export interface SavingsGoalProgress {
  goal: SavingsGoal;
  remainingMinor: number;
  percentage: number;
  monthsRemaining: number;
  suggestedMonthlyContributionMinor: number;
}

const MONTH_MS = 30 * 86_400_000;

const assertPositiveMinor = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive minor-unit integer.`);
  }
};

const assertNonNegativeMinor = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative minor-unit integer.`);
  }
};

const startOfUtcDay = (date: Date): number => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export const monthsUntil = (targetDate: string, today = new Date()): number => {
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) {
    throw new Error("Target date is invalid.");
  }

  return Math.max(1, Math.ceil((target.getTime() - today.getTime()) / MONTH_MS));
};

export const createSavingsGoal = (input: SavingsGoalInput, id = `goal-${Date.now()}`): SavingsGoal => {
  if (!input.name.trim()) {
    throw new Error("Savings goal name is required.");
  }

  assertPositiveMinor(input.targetAmountMinor, "Target amount");
  assertNonNegativeMinor(input.savedAmountMinor ?? 0, "Saved amount");
  assertNonNegativeMinor(input.monthlyContributionMinor, "Monthly contribution");

  const target = new Date(input.targetDate);
  if (Number.isNaN(target.getTime())) {
    throw new Error("Target date is invalid.");
  }
  if (startOfUtcDay(target) < startOfUtcDay(new Date())) {
    throw new Error("Target date cannot be in the past.");
  }

  const savedAmountMinor = Math.min(input.savedAmountMinor ?? 0, input.targetAmountMinor);
  const now = new Date().toISOString();

  return {
    id,
    ownerId: input.ownerId,
    name: input.name.trim(),
    targetAmountMinor: input.targetAmountMinor,
    savedAmountMinor,
    currency: input.currency,
    targetDate: target.toISOString(),
    monthlyContributionMinor: input.monthlyContributionMinor,
    status: savedAmountMinor >= input.targetAmountMinor ? "completed" : "active",
    note: input.note?.trim() || null,
    createdAt: now,
    updatedAt: now,
    createdBy: input.ownerId,
    updatedBy: input.ownerId
  };
};

export const calculateSavingsGoalProgress = (goal: SavingsGoal, today = new Date()): SavingsGoalProgress => {
  const remainingMinor = Math.max(0, goal.targetAmountMinor - goal.savedAmountMinor);
  const monthsRemaining = monthsUntil(goal.targetDate, today);

  return {
    goal,
    remainingMinor,
    percentage: goal.targetAmountMinor > 0 ? Math.min(100, Math.round((goal.savedAmountMinor / goal.targetAmountMinor) * 100)) : 0,
    monthsRemaining,
    suggestedMonthlyContributionMinor: Math.ceil(remainingMinor / monthsRemaining)
  };
};

export const getMonthlySavingsReserveMinor = (goals: SavingsGoal[]): number =>
  goals
    .filter((goal) => goal.status === "active")
    .reduce((total, goal) => total + Math.min(goal.monthlyContributionMinor, Math.max(0, goal.targetAmountMinor - goal.savedAmountMinor)), 0);

export const createSavingsGoalContribution = ({
  ownerId,
  goalId,
  amountMinor,
  currency,
  note,
  contributedAt = new Date(),
  id = `goal-contribution-${Date.now()}`
}: {
  ownerId: string;
  goalId: string;
  amountMinor: number;
  currency: CurrencyCode;
  note?: string | null;
  contributedAt?: Date;
  id?: string;
}): SavingsGoalContribution => {
  assertPositiveMinor(amountMinor, "Contribution amount");
  const now = new Date().toISOString();

  return {
    id,
    ownerId,
    goalId,
    amountMinor,
    currency,
    contributedAt: contributedAt.toISOString(),
    note: note?.trim() || null,
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId,
    updatedBy: ownerId
  };
};

export const applySavingsGoalContribution = (goal: SavingsGoal, contribution: SavingsGoalContribution): SavingsGoal => {
  if (goal.id !== contribution.goalId) {
    throw new Error("Contribution does not belong to this savings goal.");
  }

  if (goal.currency !== contribution.currency) {
    throw new Error("Contribution currency must match the savings goal.");
  }

  const savedAmountMinor = Math.min(goal.targetAmountMinor, goal.savedAmountMinor + contribution.amountMinor);

  return {
    ...goal,
    savedAmountMinor,
    status: savedAmountMinor >= goal.targetAmountMinor ? "completed" : goal.status,
    updatedAt: contribution.contributedAt,
    updatedBy: contribution.ownerId
  };
};

export const updateSavingsGoalStatus = (
  goal: SavingsGoal,
  status: SavingsGoalStatus,
  updatedAt = new Date().toISOString()
): SavingsGoal => ({
  ...goal,
  status,
  updatedAt,
  updatedBy: goal.ownerId
});
