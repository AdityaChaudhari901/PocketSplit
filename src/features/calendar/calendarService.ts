import { getSupabaseClient } from "@/lib/supabase";
import type { CurrencyCode, Transaction } from "@/types/domain";

export interface DayExpenseSummary {
  date: string;
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  expenseCount: number;
}

interface TransactionRow {
  id: string;
  owner_id: string;
  wallet_id: string;
  category_id: string;
  type: "income" | "expense";
  amount_minor: number | string;
  currency: CurrencyCode;
  merchant: string | null;
  note: string | null;
  occurred_at: string;
  receipt_id: string | null;
  is_recurring: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
}

const pad2 = (value: number): string => `${value}`.padStart(2, "0");

export const calendarDateKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

export const monthDateKey = (year: number, month: number): string => `${year}-${pad2(month)}`;

const assertValidMonth = (year: number, month: number): void => {
  if (!Number.isSafeInteger(year) || year < 1970 || year > 9999) {
    throw new Error("Year must be a safe four-digit year.");
  }
  if (!Number.isSafeInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }
};

export const getMonthBounds = (year: number, month: number) => {
  assertValidMonth(year, month);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  return {
    startDate: calendarDateKey(start),
    nextMonthDate: calendarDateKey(nextMonthStart),
    startISO: start.toISOString(),
    nextMonthStartISO: nextMonthStart.toISOString()
  };
};

const getDateBounds = (date: string) => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime())) {
    throw new Error("Date must be in YYYY-MM-DD format.");
  }
  const nextDay = new Date(parsed);
  nextDay.setUTCDate(parsed.getUTCDate() + 1);
  return {
    startISO: parsed.toISOString(),
    nextDayStartISO: nextDay.toISOString()
  };
};

const transactionDateKey = (transaction: Transaction): string => transaction.occurredAt.slice(0, 10);

const rowToTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  ownerId: row.owner_id,
  walletId: row.wallet_id,
  categoryId: row.category_id,
  type: row.type,
  amountMinor: Number(row.amount_minor),
  currency: row.currency,
  merchant: row.merchant,
  note: row.note,
  occurredAt: row.occurred_at,
  receiptId: row.receipt_id,
  isRecurring: Boolean(row.is_recurring),
  metadata: row.metadata ?? {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by
});

export const groupTransactionsByDay = (transactions: Transaction[]): DayExpenseSummary[] => {
  const summaries = new Map<string, DayExpenseSummary>();

  transactions.forEach((transaction) => {
    if (transaction.deletedAt) {
      return;
    }

    const date = transactionDateKey(transaction);
    const summary = summaries.get(date) ?? {
      date,
      totalIncomeMinor: 0,
      totalExpenseMinor: 0,
      expenseCount: 0
    };

    if (transaction.type === "income") {
      summary.totalIncomeMinor += transaction.amountMinor;
    } else {
      summary.totalExpenseMinor += transaction.amountMinor;
      summary.expenseCount += 1;
    }

    summaries.set(date, summary);
  });

  return [...summaries.values()].sort((left, right) => left.date.localeCompare(right.date));
};

/**
 * Groups local/demo transactions for one month without reading unrelated months.
 */
export const getLocalExpensesByMonth = (userId: string, year: number, month: number, transactions: Transaction[]): DayExpenseSummary[] => {
  const { startDate, nextMonthDate } = getMonthBounds(year, month);
  return groupTransactionsByDay(
    transactions.filter((transaction) => {
      const date = transactionDateKey(transaction);
      return transaction.ownerId === userId && !transaction.deletedAt && date >= startDate && date < nextMonthDate;
    })
  );
};

/**
 * Returns local/demo transactions for a single date ordered by creation time descending.
 */
export const getLocalExpensesByDate = (userId: string, date: string, transactions: Transaction[]): Transaction[] => {
  getDateBounds(date);
  return transactions
    .filter((transaction) => transaction.ownerId === userId && !transaction.deletedAt && transactionDateKey(transaction) === date)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};

/**
 * Returns all transaction summaries for a month. Supabase mode uses one date-bounded query and RLS.
 */
export const getExpensesByMonth = async (
  userId: string,
  year: number,
  month: number,
  transactions?: Transaction[]
): Promise<DayExpenseSummary[]> => {
  if (transactions) {
    return getLocalExpensesByMonth(userId, year, month, transactions);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { startISO, nextMonthStartISO } = getMonthBounds(year, month);
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .gte("occurred_at", startISO)
    .lt("occurred_at", nextMonthStartISO)
    .order("occurred_at", { ascending: true });

  if (error) {
    throw error;
  }

  return groupTransactionsByDay(((data ?? []) as TransactionRow[]).map(rowToTransaction));
};

/**
 * Returns transactions for a single calendar date ordered by newest creation time first.
 */
export const getExpensesByDate = async (userId: string, date: string, transactions?: Transaction[]): Promise<Transaction[]> => {
  if (transactions) {
    return getLocalExpensesByDate(userId, date, transactions);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { startISO, nextDayStartISO } = getDateBounds(date);
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .gte("occurred_at", startISO)
    .lt("occurred_at", nextDayStartISO)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as TransactionRow[]).map(rowToTransaction);
};
