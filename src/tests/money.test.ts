import { describe, expect, it } from "vitest";

import {
  addMoney,
  calculateBudgetUsage,
  calculateMoneyPulse,
  calculateMonthlySpendPlan,
  calculateSafeDailySpend,
  formatMoney,
  subtractMoney
} from "@/lib/money";

describe("money utilities", () => {
  it("formats integer minor units without floating point math", () => {
    expect(formatMoney(42050, "INR")).toContain("420.50");
  });

  it("adds and subtracts only matching currencies", () => {
    expect(addMoney({ amountMinor: 100, currency: "INR" }, { amountMinor: 250, currency: "INR" })).toEqual({
      amountMinor: 350,
      currency: "INR"
    });
    expect(subtractMoney({ amountMinor: 500, currency: "INR" }, { amountMinor: 125, currency: "INR" })).toEqual({
      amountMinor: 375,
      currency: "INR"
    });
    expect(() => addMoney({ amountMinor: 100, currency: "INR" }, { amountMinor: 100, currency: "USD" })).toThrow(
      "Currency mismatch"
    );
  });

  it("calculates budget usage status", () => {
    expect(calculateBudgetUsage(8000, 10000)).toMatchObject({ percentage: 80, status: "watch" });
    expect(calculateBudgetUsage(12000, 10000)).toMatchObject({ percentage: 120, status: "over" });
  });

  it("calculates safe daily spend from available money and expected bills", () => {
    expect(
      calculateSafeDailySpend({
        availableMinor: 4250000,
        expectedBillsMinor: 1800000,
        today: new Date("2026-05-20T10:00:00.000Z")
      })
    ).toBe(204166);
  });

  it("subtracts expenses from a user-set monthly spend allocation", () => {
    expect(
      calculateMonthlySpendPlan({
        incomeMinor: 2500000,
        allocatedSpendMinor: 1700000,
        expenseMinor: 1400000
      })
    ).toMatchObject({
      allocatedSpendMinor: 1700000,
      committedSpendMinor: 1400000,
      spendRemainingMinor: 300000,
      plannedSavingsMinor: 800000,
      overspendMinor: 0,
      hasSpendAllocation: true
    });
  });

  it("classifies money pulse status", () => {
    expect(calculateMoneyPulse({ incomeMinor: 100000, expenseMinor: 105000, budgetMinor: 100000 })).toBe("overspending");
    expect(calculateMoneyPulse({ incomeMinor: 100000, expenseMinor: 50000, budgetMinor: 90000, recurringBillsMinor: 50000 })).toBe(
      "bill_heavy_month"
    );
  });
});
