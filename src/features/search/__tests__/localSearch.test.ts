import { describe, expect, it } from "vitest";

import { searchExpenses, searchLocalExpenses, type SearchParams } from "@/features/search/searchService";
import type { ExpenseTag, Transaction } from "@/types/domain";

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "txn-1",
  ownerId: "user-1",
  walletId: "wallet-1",
  categoryId: "cat-food",
  type: "expense",
  amountMinor: 1000,
  currency: "INR",
  merchant: "Default merchant",
  note: "Default note",
  occurredAt: "2026-05-01T10:00:00.000Z",
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const transactions: Transaction[] = [
  makeTransaction({ id: "txn-books", merchant: "Bookstore", note: "Architecture books", amountMinor: 240000, categoryId: "cat-learning", occurredAt: "2026-05-10T10:00:00.000Z" }),
  makeTransaction({ id: "txn-dinner", merchant: "Cafe Monde", note: "Family dinner", amountMinor: 360000, categoryId: "cat-food", occurredAt: "2026-05-12T20:00:00.000Z" }),
  makeTransaction({ id: "txn-gym", merchant: "Cult Fit", note: "Monthly membership", amountMinor: 180000, categoryId: "cat-health", occurredAt: "2026-05-02T06:00:00.000Z" })
];

const expenseTags: ExpenseTag[] = [
  { expenseId: "txn-books", tagId: "tag-work", createdAt: "2026-05-10T10:00:00.000Z", createdBy: "user-1" },
  { expenseId: "txn-dinner", tagId: "tag-family", createdAt: "2026-05-12T20:00:00.000Z", createdBy: "user-1" },
  { expenseId: "txn-gym", tagId: "tag-health", createdAt: "2026-05-02T06:00:00.000Z", createdBy: "user-1" }
];

const context = {
  userId: "user-1",
  transactions,
  expenseTags
};

const expectConsistentLocalResults = async (params: SearchParams) => {
  const direct = searchLocalExpenses(params, context);
  const service = await searchExpenses(params, context);
  expect(service).toEqual(direct);
};

describe("localSearch", () => {
  it("matches text filters in local/demo mode", async () => {
    await expectConsistentLocalResults({ query: "books" });
  });

  it("matches date and amount filters in local/demo mode", async () => {
    await expectConsistentLocalResults({ fromDate: "2026-05-03", maxAmount: 300000 });
  });

  it("matches category filters in local/demo mode", async () => {
    await expectConsistentLocalResults({ categoryIds: ["cat-food"] });
  });

  it("matches tag filters in local/demo mode", async () => {
    await expectConsistentLocalResults({ tagIds: ["tag-family"] });
  });

  it("matches sorting and pagination in local/demo mode", async () => {
    await expectConsistentLocalResults({ sortBy: "amount_asc", page: 1, limit: 2 });
  });
});
