import { assertMinorUnit } from "@/lib/money";
import type { Transaction, Wallet } from "@/types/domain";

const transactionBalanceDeltaMinor = (transaction: Transaction): number =>
  transaction.type === "income" ? transaction.amountMinor : -transaction.amountMinor;

export const applyTransactionWalletEffect = ({
  wallets,
  transaction,
  direction,
  now,
  actorId
}: {
  wallets: Wallet[];
  transaction: Transaction;
  direction: 1 | -1;
  now: string;
  actorId: string;
}): Wallet[] => {
  assertMinorUnit(transaction.amountMinor);
  const deltaMinor = transactionBalanceDeltaMinor(transaction) * direction;

  return wallets.map((wallet) =>
    wallet.id === transaction.walletId && wallet.ownerId === transaction.ownerId
      ? {
          ...wallet,
          balanceMinor: wallet.balanceMinor + deltaMinor,
          updatedAt: now,
          updatedBy: actorId
        }
      : wallet
  );
};

export const applyTransactionReplacement = ({
  wallets,
  previousTransaction,
  nextTransaction,
  now,
  actorId
}: {
  wallets: Wallet[];
  previousTransaction: Transaction;
  nextTransaction: Transaction;
  now: string;
  actorId: string;
}): Wallet[] =>
  applyTransactionWalletEffect({
    wallets: applyTransactionWalletEffect({
      wallets,
      transaction: previousTransaction,
      direction: -1,
      now,
      actorId
    }),
    transaction: nextTransaction,
    direction: 1,
    now,
    actorId
  });

export const recalculateWalletBalances = ({
  wallets,
  transactions,
  now,
  actorId
}: {
  wallets: Wallet[];
  transactions: Transaction[];
  now: string;
  actorId: string;
}): Wallet[] =>
  transactions
    .filter((transaction) => !transaction.deletedAt)
    .reduce<Wallet[]>(
      (nextWallets, transaction) =>
        applyTransactionWalletEffect({
          wallets: nextWallets,
          transaction,
          direction: 1,
          now,
          actorId
        }),
      wallets.map(
        (wallet): Wallet => ({
          ...wallet,
          balanceMinor: 0,
          updatedAt: now,
          updatedBy: actorId
        })
      )
    );

export const isTransactionInMonth = (transaction: Transaction, month: string): boolean => {
  const occurredAt = new Date(transaction.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return false;
  }

  const transactionMonth = `${occurredAt.getFullYear()}-${`${occurredAt.getMonth() + 1}`.padStart(2, "0")}`;
  return transactionMonth === month;
};

export const sumCategorySpend = (transactions: Transaction[], categoryId: string, month?: string): number =>
  transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.categoryId === categoryId &&
        !transaction.deletedAt &&
        (!month || isTransactionInMonth(transaction, month))
    )
    .reduce((total, transaction) => total + transaction.amountMinor, 0);
