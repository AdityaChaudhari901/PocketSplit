import { describe, expect, it } from "vitest";

import { getExpensesByDate, getExpensesByMonth, getLocalExpensesByMonth } from "@/features/calendar/calendarService";
import type { Transaction } from "@/types/domain";

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

const transactions: Transaction[] = [
  makeTransaction({ id: "txn-food-1", amountMinor: 12500, occurredAt: "2026-05-01T10:00:00.000Z", createdAt: "2026-05-01T10:05:00.000Z" }),
  makeTransaction({ id: "txn-food-2", amountMinor: 8750, occurredAt: "2026-05-01T18:00:00.000Z", createdAt: "2026-05-01T18:05:00.000Z" }),
  makeTransaction({ id: "txn-salary", type: "income", amountMinor: 2500000, categoryId: "cat-salary", occurredAt: "2026-05-01T08:00:00.000Z", createdAt: "2026-05-01T08:05:00.000Z" }),
  makeTransaction({ id: "txn-travel", amountMinor: 43000, categoryId: "cat-travel", occurredAt: "2026-05-18T12:00:00.000Z", createdAt: "2026-05-18T12:05:00.000Z" }),
  makeTransaction({ id: "txn-june", amountMinor: 99900, occurredAt: "2026-06-01T00:00:00.000Z", createdAt: "2026-06-01T00:05:00.000Z" }),
  makeTransaction({ id: "txn-other-user", ownerId: "user-2", amountMinor: 11100, occurredAt: "2026-05-01T11:00:00.000Z" }),
  makeTransaction({ id: "txn-deleted", amountMinor: 22200, occurredAt: "2026-05-01T12:00:00.000Z", deletedAt: "2026-05-02T00:00:00.000Z" })
];

describe("calendarService", () => {
  it("returns grouped data for a month", async () => {
    const result = await getExpensesByMonth("user-1", 2026, 5, transactions);
    expect(result.map((summary) => summary.date)).toEqual(["2026-05-01", "2026-05-18"]);
  });

  it("returns empty array for a month with no expenses", async () => {
    await expect(getExpensesByMonth("user-1", 2026, 7, transactions)).resolves.toEqual([]);
  });

  it("separates income and expense totals", async () => {
    const [mayFirst] = await getExpensesByMonth("user-1", 2026, 5, transactions);
    expect(mayFirst).toMatchObject({
      date: "2026-05-01",
      totalIncomeMinor: 2500000,
      totalExpenseMinor: 21250,
      expenseCount: 2
    });
  });

  it("returns expenses for a specific day ordered by createdAt desc", async () => {
    const result = await getExpensesByDate("user-1", "2026-05-01", transactions);
    expect(result.map((transaction) => transaction.id)).toEqual(["txn-food-2", "txn-food-1", "txn-salary"]);
  });

  it("returns empty for a day with no expenses", async () => {
    await expect(getExpensesByDate("user-1", "2026-05-03", transactions)).resolves.toEqual([]);
  });

  it("keeps DayExpenseSummary totals in minor units", async () => {
    const [summary] = await getExpensesByMonth("user-1", 2026, 5, transactions);
    expect(summary?.totalExpenseMinor).toBe(21250);
    expect(summary?.totalIncomeMinor).toBe(2500000);
  });

  it("handles Jan and Dec month boundaries", () => {
    const boundaryTransactions = [
      makeTransaction({ id: "txn-dec", occurredAt: "2025-12-31T23:59:59.000Z" }),
      makeTransaction({ id: "txn-jan-start", amountMinor: 2000, occurredAt: "2026-01-01T00:00:00.000Z" }),
      makeTransaction({ id: "txn-jan-end", amountMinor: 3000, occurredAt: "2026-01-31T23:59:59.000Z" }),
      makeTransaction({ id: "txn-feb", occurredAt: "2026-02-01T00:00:00.000Z" })
    ];

    expect(getLocalExpensesByMonth("user-1", 2026, 1, boundaryTransactions)).toEqual([
      { date: "2026-01-01", totalIncomeMinor: 0, totalExpenseMinor: 2000, expenseCount: 1 },
      { date: "2026-01-31", totalIncomeMinor: 0, totalExpenseMinor: 3000, expenseCount: 1 }
    ]);
  });
});
