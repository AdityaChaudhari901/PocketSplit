import { getSupabaseClient } from "@/lib/supabase";
import type { Budget, Category, CurrencyCode, SavingsGoal, Transaction } from "@/types/domain";

export interface MonthlySummary {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netSavingsMinor: number;
  expenseCount: number;
  incomeCount: number;
}

export interface MonthlyTrendPoint {
  month: string;
  incomeMinor: number;
  expenseMinor: number;
}

export interface CategoryBreakdownRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalMinor: number;
  percentage: number;
}

export interface TopMerchantRow {
  merchant: string;
  totalMinor: number;
  count: number;
}

export interface BudgetVsActualRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budgetedMinor: number;
  actualMinor: number;
  remainingMinor: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface SavingsProgressRow {
  goalId: string;
  goalName: string;
  targetAmountMinor: number;
  savedAmountMinor: number;
  remainingMinor: number;
  percentage: number;
  status: SavingsGoal["status"];
}

export interface ReportsContext {
  transactions?: Transaction[];
  categories?: Category[];
  budgets?: Budget[];
  savingsGoals?: SavingsGoal[];
  referenceDate?: Date;
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

interface CategoryRow {
  id: string;
  owner_id: string | null;
  name: string;
  kind: "income" | "expense";
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  is_system: boolean | null;
  is_archived?: boolean | null;
  is_default?: boolean | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

interface BudgetRow {
  id: string;
  owner_id: string;
  category_id: string;
  month: string;
  amount_minor: number | string;
  currency: CurrencyCode;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
}

interface SavingsGoalRow {
  id: string;
  owner_id: string;
  name: string;
  target_amount_minor: number | string;
  saved_amount_minor: number | string;
  currency: CurrencyCode;
  target_date: string;
  monthly_contribution_minor: number | string;
  status: SavingsGoal["status"];
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
}

const DEFAULT_CATEGORY_COLOR = "#6B7280";

const pad2 = (value: number): string => `${value}`.padStart(2, "0");

export const reportMonthKey = (year: number, month: number): string => `${year}-${pad2(month)}`;

const assertMonth = (year: number, month: number): void => {
  if (!Number.isSafeInteger(year) || year < 1970 || year > 9999) {
    throw new Error("Year must be a safe four-digit year.");
  }
  if (!Number.isSafeInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }
};

const monthBounds = (year: number, month: number) => {
  assertMonth(year, month);
  return {
    startISO: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    nextMonthISO: new Date(Date.UTC(year, month, 1)).toISOString(),
    monthKey: reportMonthKey(year, month)
  };
};

const shiftMonth = (year: number, month: number, offset: number) => {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    key: reportMonthKey(date.getUTCFullYear(), date.getUTCMonth() + 1)
  };
};

const transactionMonthKey = (transaction: Transaction): string => transaction.occurredAt.slice(0, 7);

const transactionDateInMonth = (transaction: Transaction, year: number, month: number): boolean =>
  !transaction.deletedAt && transactionMonthKey(transaction) === reportMonthKey(year, month);

const assertSafeNonNegativeInteger = (value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Expected a non-negative safe integer.");
  }
};

const integerPercent = (value: number, total: number): number => {
  assertSafeNonNegativeInteger(value);
  assertSafeNonNegativeInteger(total);
  if (total <= 0) {
    return 0;
  }

  return Number((BigInt(value) * 100n) / BigInt(total));
};

const distributePercentages = <Row extends { totalMinor: number }>(rows: Row[], totalMinor: number): number[] => {
  assertSafeNonNegativeInteger(totalMinor);
  if (rows.length === 0 || totalMinor <= 0) {
    return rows.map(() => 0);
  }

  const total = BigInt(totalMinor);
  const baseRows = rows.map((row, index) => {
    assertSafeNonNegativeInteger(row.totalMinor);
    const scaled = BigInt(row.totalMinor) * 100n;
    return {
      index,
      percentage: Number(scaled / total),
      remainder: scaled % total
    };
  });
  const allocated = baseRows.reduce((sum, row) => sum + row.percentage, 0);
  let remainderPoints = Math.max(0, 100 - allocated);
  const byRemainder = [...baseRows].sort((left, right) => {
    if (left.remainder === right.remainder) {
      return left.index - right.index;
    }
    return left.remainder > right.remainder ? -1 : 1;
  });

  byRemainder.forEach((row) => {
    if (remainderPoints <= 0) {
      return;
    }
    row.percentage += 1;
    remainderPoints -= 1;
  });

  return baseRows.map((row) => row.percentage);
};

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

const rowToCategory = (row: CategoryRow): Category => ({
  id: row.id,
  ownerId: row.owner_id ?? "",
  name: row.name,
  kind: row.kind,
  icon: row.icon ?? "circle",
  color: row.color ?? DEFAULT_CATEGORY_COLOR,
  parentId: row.parent_id,
  isSystem: Boolean(row.is_system),
  isArchived: Boolean(row.is_archived || row.deleted_at),
  isDefault: Boolean(row.is_default),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by ?? "",
  updatedBy: row.updated_by
});

const rowToBudget = (row: BudgetRow): Budget => ({
  id: row.id,
  ownerId: row.owner_id,
  categoryId: row.category_id,
  month: row.month,
  amountMinor: Number(row.amount_minor),
  currency: row.currency,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by
});

const rowToSavingsGoal = (row: SavingsGoalRow): SavingsGoal => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  targetAmountMinor: Number(row.target_amount_minor),
  savedAmountMinor: Number(row.saved_amount_minor),
  currency: row.currency,
  targetDate: row.target_date,
  monthlyContributionMinor: Number(row.monthly_contribution_minor),
  status: row.status,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by
});

const getClientOrThrow = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
};

const fetchTransactionsForPeriod = async (userId: string, startISO: string, endISO: string): Promise<Transaction[]> => {
  const { data, error } = await getClientOrThrow()
    .from("transactions")
    .select("*")
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .gte("occurred_at", startISO)
    .lt("occurred_at", endISO);

  if (error) {
    throw error;
  }

  return ((data ?? []) as TransactionRow[]).map(rowToTransaction);
};

const fetchCategories = async (userId: string): Promise<Category[]> => {
  const { data, error } = await getClientOrThrow()
    .from("categories")
    .select("*")
    .or(`owner_id.eq.${userId},user_id.eq.${userId},user_id.is.null`)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return ((data ?? []) as CategoryRow[]).map(rowToCategory);
};

const fetchBudgets = async (userId: string, month: string): Promise<Budget[]> => {
  const { data, error } = await getClientOrThrow().from("budgets").select("*").eq("owner_id", userId).eq("month", month).is("deleted_at", null);

  if (error) {
    throw error;
  }

  return ((data ?? []) as BudgetRow[]).map(rowToBudget);
};

const fetchSavingsGoals = async (userId: string): Promise<SavingsGoal[]> => {
  const { data, error } = await getClientOrThrow().from("savings_goals").select("*").eq("owner_id", userId).is("deleted_at", null);

  if (error) {
    throw error;
  }

  return ((data ?? []) as SavingsGoalRow[]).map(rowToSavingsGoal);
};

const summarizeTransactions = (transactions: Transaction[]): MonthlySummary =>
  transactions.reduce<MonthlySummary>(
    (summary, transaction) => {
      if (transaction.deletedAt) {
        return summary;
      }

      if (transaction.type === "income") {
        summary.totalIncomeMinor += transaction.amountMinor;
        summary.incomeCount += 1;
      } else {
        summary.totalExpenseMinor += transaction.amountMinor;
        summary.expenseCount += 1;
      }

      summary.netSavingsMinor = summary.totalIncomeMinor - summary.totalExpenseMinor;
      return summary;
    },
    {
      totalIncomeMinor: 0,
      totalExpenseMinor: 0,
      netSavingsMinor: 0,
      expenseCount: 0,
      incomeCount: 0
    }
  );

const getLocalMonthTransactions = (userId: string, year: number, month: number, transactions: Transaction[] = []): Transaction[] =>
  transactions.filter((transaction) => transaction.ownerId === userId && transactionDateInMonth(transaction, year, month));

/**
 * Returns income, expense, net savings, and counts for one month.
 */
export const getMonthlySummary = async (userId: string, year: number, month: number, context: ReportsContext = {}): Promise<MonthlySummary> => {
  const { startISO, nextMonthISO } = monthBounds(year, month);
  const transactions = context.transactions
    ? getLocalMonthTransactions(userId, year, month, context.transactions)
    : await fetchTransactionsForPeriod(userId, startISO, nextMonthISO);

  return summarizeTransactions(transactions);
};

/**
 * Returns the last N months of income and expense totals ending in the current/reference month.
 */
export const getMonthlyTrend = async (userId: string, months: number, context: ReportsContext = {}): Promise<MonthlyTrendPoint[]> => {
  const monthCount = Number.isSafeInteger(months) && months > 0 ? months : 6;
  const referenceDate = context.referenceDate ?? new Date();
  const anchor = { year: referenceDate.getFullYear(), month: referenceDate.getMonth() + 1 };
  const monthKeys = Array.from({ length: monthCount }, (_item, index) => shiftMonth(anchor.year, anchor.month, index - monthCount + 1).key);
  const first = shiftMonth(anchor.year, anchor.month, 1 - monthCount);
  const afterLast = shiftMonth(anchor.year, anchor.month, 1);
  const transactions = context.transactions
    ? context.transactions.filter((transaction) => transaction.ownerId === userId && !transaction.deletedAt && monthKeys.includes(transactionMonthKey(transaction)))
    : await fetchTransactionsForPeriod(userId, monthBounds(first.year, first.month).startISO, monthBounds(afterLast.year, afterLast.month).startISO);

  const totals = new Map(monthKeys.map((monthKey) => [monthKey, { month: monthKey, incomeMinor: 0, expenseMinor: 0 } satisfies MonthlyTrendPoint]));
  transactions.forEach((transaction) => {
    const key = transactionMonthKey(transaction);
    const row = totals.get(key);
    if (!row) {
      return;
    }

    if (transaction.type === "income") {
      row.incomeMinor += transaction.amountMinor;
    } else {
      row.expenseMinor += transaction.amountMinor;
    }
  });

  return monthKeys.map((key) => totals.get(key)!);
};

/**
 * Returns expense totals by category for one month, sorted by spend descending.
 */
export const getCategoryBreakdown = async (
  userId: string,
  year: number,
  month: number,
  context: ReportsContext = {}
): Promise<CategoryBreakdownRow[]> => {
  const { startISO, nextMonthISO } = monthBounds(year, month);
  const transactions = context.transactions
    ? getLocalMonthTransactions(userId, year, month, context.transactions)
    : await fetchTransactionsForPeriod(userId, startISO, nextMonthISO);
  const categories = context.categories ?? (await fetchCategories(userId));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amountMinor);
    });

  const rows = [...totals.entries()]
    .map(([categoryId, totalMinor]) => {
      const category = categoriesById.get(categoryId);
      return {
        categoryId,
        categoryName: category?.name ?? "Uncategorized",
        categoryColor: category?.color ?? DEFAULT_CATEGORY_COLOR,
        totalMinor,
        percentage: 0
      };
    })
    .sort((left, right) => right.totalMinor - left.totalMinor);

  const totalExpenseMinor = rows.reduce((total, row) => total + row.totalMinor, 0);
  const percentages = distributePercentages(rows, totalExpenseMinor);
  return rows.map((row, index) => ({ ...row, percentage: percentages[index] ?? 0 }));
};

/**
 * Returns top merchants by expense spend for one month.
 */
export const getTopMerchants = async (
  userId: string,
  year: number,
  month: number,
  limit = 5,
  context: ReportsContext = {}
): Promise<TopMerchantRow[]> => {
  const { startISO, nextMonthISO } = monthBounds(year, month);
  const transactions = context.transactions
    ? getLocalMonthTransactions(userId, year, month, context.transactions)
    : await fetchTransactionsForPeriod(userId, startISO, nextMonthISO);
  const topLimit = Number.isSafeInteger(limit) && limit > 0 ? limit : 5;
  const merchantTotals = new Map<string, TopMerchantRow>();

  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const merchant = transaction.merchant?.trim() || "Unknown merchant";
      const current = merchantTotals.get(merchant) ?? { merchant, totalMinor: 0, count: 0 };
      current.totalMinor += transaction.amountMinor;
      current.count += 1;
      merchantTotals.set(merchant, current);
    });

  return [...merchantTotals.values()].sort((left, right) => right.totalMinor - left.totalMinor || right.count - left.count).slice(0, topLimit);
};

/**
 * Returns budgeted vs actual category spend for one month when budgets exist.
 */
export const getBudgetVsActual = async (
  userId: string,
  year: number,
  month: number,
  context: ReportsContext = {}
): Promise<BudgetVsActualRow[]> => {
  const monthId = monthBounds(year, month).monthKey;
  const budgets = (context.budgets ?? (await fetchBudgets(userId, monthId))).filter((budget) => budget.ownerId === userId && budget.month === monthId && !budget.deletedAt);
  if (budgets.length === 0) {
    return [];
  }

  const breakdown = await getCategoryBreakdown(userId, year, month, context);
  const actualByCategoryId = new Map(breakdown.map((row) => [row.categoryId, row.totalMinor]));
  const categories = context.categories ?? (await fetchCategories(userId));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return budgets
    .map((budget) => {
      const category = categoriesById.get(budget.categoryId);
      const actualMinor = actualByCategoryId.get(budget.categoryId) ?? 0;
      return {
        categoryId: budget.categoryId,
        categoryName: category?.name ?? "Uncategorized",
        categoryColor: category?.color ?? DEFAULT_CATEGORY_COLOR,
        budgetedMinor: budget.amountMinor,
        actualMinor,
        remainingMinor: budget.amountMinor - actualMinor,
        percentage: budget.amountMinor > 0 ? integerPercent(actualMinor, budget.amountMinor) : 0,
        isOverBudget: actualMinor > budget.amountMinor
      };
    })
    .sort((left, right) => right.actualMinor - left.actualMinor);
};

/**
 * Returns active savings goal progress when the savings goal model is available.
 */
export const getSavingsProgress = async (userId: string, context: ReportsContext = {}): Promise<SavingsProgressRow[] | null> => {
  const goals = (context.savingsGoals ?? (await fetchSavingsGoals(userId))).filter(
    (goal) => goal.ownerId === userId && !goal.deletedAt && goal.status !== "archived"
  );

  return goals.map((goal) => ({
    goalId: goal.id,
    goalName: goal.name,
    targetAmountMinor: goal.targetAmountMinor,
    savedAmountMinor: goal.savedAmountMinor,
    remainingMinor: Math.max(0, goal.targetAmountMinor - goal.savedAmountMinor),
    percentage: goal.targetAmountMinor > 0 ? integerPercent(goal.savedAmountMinor, goal.targetAmountMinor) : 0,
    status: goal.status
  }));
};
