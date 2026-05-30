import { describe, expect, it } from "vitest";

import {
  getCategoryBreakdown,
  getMonthlySummary,
  getMonthlyTrend,
  getTopMerchants
} from "@/features/reports/reportsService";
import type { Category, Transaction } from "@/types/domain";

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "txn-1",
  ownerId: "user-1",
  walletId: "wallet-1",
  categoryId: "cat-food",
  type: "expense",
  amountMinor: 1000,
  currency: "INR",
  merchant: "Cafe",
  note: "Lunch",
  occurredAt: "2026-05-01T10:00:00.000Z",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-food",
  ownerId: "user-1",
  name: "Food",
  kind: "expense",
  icon: "restaurant",
  color: "#DC3E53",
  isSystem: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const categories: Category[] = [
  makeCategory(),
  makeCategory({ id: "cat-travel", name: "Travel", color: "#1769E0" }),
  makeCategory({ id: "cat-home", name: "Home", color: "#0F766E" }),
  makeCategory({ id: "cat-income", name: "Salary", kind: "income", color: "#059669" })
];

const transactions: Transaction[] = [
  makeTransaction({ id: "txn-food-1", amountMinor: 12500, merchant: "Cafe", categoryId: "cat-food", occurredAt: "2026-05-03T10:00:00.000Z" }),
  makeTransaction({ id: "txn-food-2", amountMinor: 7500, merchant: "Cafe", categoryId: "cat-food", occurredAt: "2026-05-12T10:00:00.000Z" }),
  makeTransaction({ id: "txn-travel", amountMinor: 30000, merchant: "IndiGo", categoryId: "cat-travel", occurredAt: "2026-05-18T10:00:00.000Z" }),
  makeTransaction({ id: "txn-home", amountMinor: 10000, merchant: "Ikea", categoryId: "cat-home", occurredAt: "2026-05-20T10:00:00.000Z" }),
  makeTransaction({ id: "txn-salary", type: "income", amountMinor: 2500000, merchant: "Fynd", categoryId: "cat-income", occurredAt: "2026-05-28T10:00:00.000Z" }),
  makeTransaction({ id: "txn-april", amountMinor: 42000, merchant: "Cafe", categoryId: "cat-food", occurredAt: "2026-04-02T10:00:00.000Z" }),
  makeTransaction({ id: "txn-dec", type: "income", amountMinor: 100000, merchant: "Bonus", categoryId: "cat-income", occurredAt: "2025-12-15T10:00:00.000Z" }),
  makeTransaction({ id: "txn-jan", amountMinor: 15000, merchant: "Books", categoryId: "cat-home", occurredAt: "2026-01-10T10:00:00.000Z" }),
  makeTransaction({ id: "txn-other-user", ownerId: "user-2", amountMinor: 999999, occurredAt: "2026-05-01T10:00:00.000Z" }),
  makeTransaction({ id: "txn-deleted", amountMinor: 999999, deletedAt: "2026-05-02T00:00:00.000Z", occurredAt: "2026-05-01T10:00:00.000Z" })
];

const context = { transactions, categories };

describe("reportsService", () => {
  it("returns correct monthly summary totals", async () => {
    const summary = await getMonthlySummary("user-1", 2026, 5, context);
    expect(summary).toEqual({
      totalIncomeMinor: 2500000,
      totalExpenseMinor: 60000,
      netSavingsMinor: 2440000,
      expenseCount: 4,
      incomeCount: 1
    });
  });

  it("returns zeros for an empty month", async () => {
    await expect(getMonthlySummary("user-1", 2026, 7, context)).resolves.toEqual({
      totalIncomeMinor: 0,
      totalExpenseMinor: 0,
      netSavingsMinor: 0,
      expenseCount: 0,
      incomeCount: 0
    });
  });

  it("returns the requested number of trend months", async () => {
    const trend = await getMonthlyTrend("user-1", 3, { ...context, referenceDate: new Date("2026-05-01T00:00:00.000Z") });
    expect(trend.map((row) => row.month)).toEqual(["2026-03", "2026-04", "2026-05"]);
    expect(trend[2]).toMatchObject({ incomeMinor: 2500000, expenseMinor: 60000 });
  });

  it("handles year boundaries in monthly trend", async () => {
    const trend = await getMonthlyTrend("user-1", 3, { ...context, referenceDate: new Date("2026-01-01T00:00:00.000Z") });
    expect(trend).toEqual([
      { month: "2025-11", incomeMinor: 0, expenseMinor: 0 },
      { month: "2025-12", incomeMinor: 100000, expenseMinor: 0 },
      { month: "2026-01", incomeMinor: 0, expenseMinor: 15000 }
    ]);
  });

  it("calculates category percentages correctly", async () => {
    const breakdown = await getCategoryBreakdown("user-1", 2026, 5, context);
    expect(breakdown.map((row) => [row.categoryName, row.totalMinor, row.percentage])).toEqual([
      ["Travel", 30000, 50],
      ["Food", 20000, 33],
      ["Home", 10000, 17]
    ]);
  });

  it("category percentages sum to 100", async () => {
    const breakdown = await getCategoryBreakdown("user-1", 2026, 5, context);
    expect(breakdown.reduce((total, row) => total + row.percentage, 0)).toBe(100);
  });

  it("returns correct top N merchants", async () => {
    const merchants = await getTopMerchants("user-1", 2026, 5, 2, context);
    expect(merchants).toEqual([
      { merchant: "IndiGo", totalMinor: 30000, count: 1 },
      { merchant: "Cafe", totalMinor: 20000, count: 2 }
    ]);
  });

  it("top merchants handles an empty month", async () => {
    await expect(getTopMerchants("user-1", 2026, 7, 5, context)).resolves.toEqual([]);
  });

  it("returns all amounts in minor units", async () => {
    const summary = await getMonthlySummary("user-1", 2026, 5, context);
    const [merchant] = await getTopMerchants("user-1", 2026, 5, 1, context);
    expect(summary.totalExpenseMinor).toBe(60000);
    expect(merchant?.totalMinor).toBe(30000);
  });

  it("uses safe integer percentage math without floating point drift", async () => {
    const exactThirds = [
      makeTransaction({ id: "txn-a", amountMinor: 1, categoryId: "cat-food", occurredAt: "2026-06-01T10:00:00.000Z" }),
      makeTransaction({ id: "txn-b", amountMinor: 1, categoryId: "cat-travel", occurredAt: "2026-06-01T11:00:00.000Z" }),
      makeTransaction({ id: "txn-c", amountMinor: 1, categoryId: "cat-home", occurredAt: "2026-06-01T12:00:00.000Z" })
    ];

    const breakdown = await getCategoryBreakdown("user-1", 2026, 6, { transactions: exactThirds, categories });
    expect(breakdown.map((row) => row.percentage).sort((left, right) => right - left)).toEqual([34, 33, 33]);
    expect(breakdown.reduce((total, row) => total + row.percentage, 0)).toBe(100);
  });
});
