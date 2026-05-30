import { describe, expect, it } from "vitest";

import { searchLocalExpenses } from "@/features/search/searchService";
import type { ExpenseTag, Transaction } from "@/types/domain";

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "txn-1",
  ownerId: "user-1",
  walletId: "wallet-1",
  categoryId: "cat-food",
  type: "expense",
  amountMinor: 1000,
  currency: "INR",
  merchant: "Coffee House",
  note: "Morning coffee",
  occurredAt: "2026-05-01T10:00:00.000Z",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const transactions: Transaction[] = [
  makeTransaction({ id: "txn-coffee", merchant: "Blue Tokai", note: "Coffee with team", amountMinor: 45000, categoryId: "cat-food", occurredAt: "2026-05-04T10:00:00.000Z" }),
  makeTransaction({ id: "txn-rent", merchant: "Nestaway", note: "May apartment rent", amountMinor: 3000000, categoryId: "cat-home", occurredAt: "2026-05-01T09:00:00.000Z" }),
  makeTransaction({ id: "txn-flight", merchant: "IndiGo", note: "Goa trip tickets", amountMinor: 780000, categoryId: "cat-travel", occurredAt: "2026-05-18T12:00:00.000Z" }),
  makeTransaction({ id: "txn-salary", merchant: "Fynd", note: "Monthly salary", amountMinor: 25000000, categoryId: "cat-salary", type: "income", occurredAt: "2026-05-28T08:00:00.000Z" }),
  makeTransaction({ id: "txn-other-user", ownerId: "user-2", merchant: "Hidden", note: "Other user", amountMinor: 99900 }),
  makeTransaction({ id: "txn-deleted", merchant: "Deleted", note: "Archived transaction", deletedAt: "2026-05-30T00:00:00.000Z" })
];

const expenseTags: ExpenseTag[] = [
  { expenseId: "txn-coffee", tagId: "tag-team", createdAt: "2026-05-04T10:00:00.000Z", createdBy: "user-1" },
  { expenseId: "txn-coffee", tagId: "tag-food", createdAt: "2026-05-04T10:00:00.000Z", createdBy: "user-1" },
  { expenseId: "txn-flight", tagId: "tag-trip", createdAt: "2026-05-18T12:00:00.000Z", createdBy: "user-1" }
];

const context = {
  userId: "user-1",
  transactions,
  expenseTags
};

describe("searchService", () => {
  it("returns all expenses for the user when query is empty", () => {
    const result = searchLocalExpenses({}, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-salary", "txn-flight", "txn-coffee", "txn-rent"]);
    expect(result.total).toBe(4);
  });

  it("filters text query by merchant name", () => {
    const result = searchLocalExpenses({ query: "tokai" }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-coffee"]);
  });

  it("filters text query by note", () => {
    const result = searchLocalExpenses({ query: "apartment" }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-rent"]);
  });

  it("returns correct expenses for a date range", () => {
    const result = searchLocalExpenses({ fromDate: "2026-05-02", toDate: "2026-05-20" }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-flight", "txn-coffee"]);
  });

  it("filters by amount range in minor units", () => {
    const result = searchLocalExpenses({ minAmount: 500000, maxAmount: 1000000 }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-flight"]);
  });

  it("filters by category", () => {
    const result = searchLocalExpenses({ categoryIds: ["cat-home"] }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-rent"]);
  });

  it("filters by tag using AND semantics", () => {
    const result = searchLocalExpenses({ tagIds: ["tag-team", "tag-food"] }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-coffee"]);
  });

  it("applies combined filters with AND logic", () => {
    const result = searchLocalExpenses({ query: "coffee", categoryIds: ["cat-food"], tagIds: ["tag-team"], maxAmount: 50000 }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-coffee"]);
  });

  it("sorts by date descending by default", () => {
    const result = searchLocalExpenses({}, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-salary", "txn-flight", "txn-coffee", "txn-rent"]);
  });

  it("sorts by amount descending", () => {
    const result = searchLocalExpenses({ sortBy: "amount_desc" }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-salary", "txn-rent", "txn-flight", "txn-coffee"]);
  });

  it("returns the requested pagination page", () => {
    const result = searchLocalExpenses({ page: 2, limit: 2 }, context);
    expect(result.items.map((item) => item.id)).toEqual(["txn-coffee", "txn-rent"]);
    expect(result.hasMore).toBe(false);
  });
});
