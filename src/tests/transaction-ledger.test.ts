import { describe, expect, it } from "vitest";

import { applyTransactionReplacement, applyTransactionWalletEffect, recalculateWalletBalances, sumCategorySpend } from "@/lib/transaction-ledger";
import type { Transaction, Wallet } from "@/types/domain";

const baseWallet: Wallet = {
  id: "wallet-1",
  ownerId: "user-1",
  name: "Primary wallet",
  type: "bank",
  currency: "INR",
  balanceMinor: 0,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  createdBy: "user-1"
};

const makeTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: "txn-1",
  ownerId: "user-1",
  walletId: "wallet-1",
  categoryId: "cat-food",
  type: "expense",
  amountMinor: 10000,
  currency: "INR",
  merchant: null,
  note: null,
  occurredAt: "2026-05-15T10:00:00.000Z",
  createdAt: "2026-05-15T10:00:00.000Z",
  updatedAt: "2026-05-15T10:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

describe("transaction ledger utilities", () => {
  it("applies income and expense effects to wallet balance", () => {
    const income = makeTransaction({ type: "income", amountMinor: 2500000, categoryId: "cat-income" });
    const expense = makeTransaction({ id: "txn-2", type: "expense", amountMinor: 1400000 });
    const afterIncome = applyTransactionWalletEffect({
      wallets: [baseWallet],
      transaction: income,
      direction: 1,
      now: "2026-05-28T00:00:00.000Z",
      actorId: "user-1"
    });
    const afterExpense = applyTransactionWalletEffect({
      wallets: afterIncome,
      transaction: expense,
      direction: 1,
      now: "2026-05-28T00:00:00.000Z",
      actorId: "user-1"
    });

    expect(afterExpense[0]?.balanceMinor).toBe(1100000);
  });

  it("reverses an old transaction before applying an edit", () => {
    const oldExpense = makeTransaction({ amountMinor: 50000 });
    const newExpense = makeTransaction({ amountMinor: 80000 });

    const wallets = applyTransactionReplacement({
      wallets: [{ ...baseWallet, balanceMinor: -50000 }],
      previousTransaction: oldExpense,
      nextTransaction: newExpense,
      now: "2026-05-28T00:00:00.000Z",
      actorId: "user-1"
    });

    expect(wallets[0]?.balanceMinor).toBe(-80000);
  });

  it("scopes category spend to the requested month", () => {
    const transactions = [
      makeTransaction({ id: "txn-may", amountMinor: 70000, occurredAt: "2026-05-04T00:00:00.000Z" }),
      makeTransaction({ id: "txn-apr", amountMinor: 90000, occurredAt: "2026-04-04T00:00:00.000Z" })
    ];

    expect(sumCategorySpend(transactions, "cat-food", "2026-05")).toBe(70000);
  });

  it("recalculates wallet balances from non-deleted transactions", () => {
    const transactions = [
      makeTransaction({ id: "txn-income", type: "income", amountMinor: 2500000, categoryId: "cat-income" }),
      makeTransaction({ id: "txn-expense", type: "expense", amountMinor: 1400000 }),
      makeTransaction({ id: "txn-deleted", type: "expense", amountMinor: 100000, deletedAt: "2026-05-20T00:00:00.000Z" })
    ];

    const wallets = recalculateWalletBalances({
      wallets: [{ ...baseWallet, balanceMinor: 999999 }],
      transactions,
      now: "2026-05-28T00:00:00.000Z",
      actorId: "user-1"
    });

    expect(wallets[0]?.balanceMinor).toBe(1100000);
  });
});
