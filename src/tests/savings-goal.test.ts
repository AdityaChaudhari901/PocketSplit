import { describe, expect, it } from "vitest";

import {
  applySavingsGoalContribution,
  calculateSavingsGoalProgress,
  createSavingsGoal,
  createSavingsGoalContribution,
  getMonthlySavingsReserveMinor
} from "@/services/savings-goal.service";
import type { SavingsGoal } from "@/types/domain";

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: "goal-emergency",
  ownerId: "user-1",
  name: "Emergency fund",
  targetAmountMinor: 10000000,
  savedAmountMinor: 2500000,
  currency: "INR",
  targetDate: "2026-11-28T00:00:00.000Z",
  monthlyContributionMinor: 1000000,
  status: "active",
  createdAt: "2026-05-28T00:00:00.000Z",
  updatedAt: "2026-05-28T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

describe("savings goal service", () => {
  it("creates a normalized active savings goal", () => {
    expect(
      createSavingsGoal(
        {
          ownerId: "user-1",
          name: "  Goa trip  ",
          targetAmountMinor: 6000000,
          savedAmountMinor: 500000,
          currency: "INR",
          targetDate: "2099-12-01",
          monthlyContributionMinor: 750000
        },
        "goal-goa"
      )
    ).toMatchObject({
      id: "goal-goa",
      name: "Goa trip",
      status: "active",
      savedAmountMinor: 500000
    });
  });

  it("rejects target dates in the past", () => {
    expect(() =>
      createSavingsGoal(
        {
          ownerId: "user-1",
          name: "Late goal",
          targetAmountMinor: 6000000,
          currency: "INR",
          targetDate: "2000-01-01",
          monthlyContributionMinor: 750000
        },
        "goal-late"
      )
    ).toThrow("Target date cannot be in the past.");
  });

  it("calculates progress and suggested monthly contribution", () => {
    expect(calculateSavingsGoalProgress(goal(), new Date("2026-05-28T00:00:00.000Z"))).toMatchObject({
      remainingMinor: 7500000,
      percentage: 25,
      monthsRemaining: 7,
      suggestedMonthlyContributionMinor: 1071429
    });
  });

  it("reserves active planned contributions for safe daily spend", () => {
    expect(
      getMonthlySavingsReserveMinor([
        goal({ monthlyContributionMinor: 1000000 }),
        goal({ id: "goal-paused", status: "paused", monthlyContributionMinor: 2000000 }),
        goal({ id: "goal-nearly-done", targetAmountMinor: 5000000, savedAmountMinor: 4900000, monthlyContributionMinor: 400000 })
      ])
    ).toBe(1100000);
  });

  it("applies contributions and completes the goal when target is reached", () => {
    const contribution = createSavingsGoalContribution({
      ownerId: "user-1",
      goalId: "goal-emergency",
      amountMinor: 8000000,
      currency: "INR",
      contributedAt: new Date("2026-06-01T00:00:00.000Z"),
      id: "contribution-1"
    });

    expect(applySavingsGoalContribution(goal(), contribution)).toMatchObject({
      savedAmountMinor: 10000000,
      status: "completed",
      updatedAt: "2026-06-01T00:00:00.000Z"
    });
  });
});
