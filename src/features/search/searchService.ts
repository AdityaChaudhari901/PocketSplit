import { getSupabaseClient } from "@/lib/supabase";
import type { CurrencyCode, ExpenseTag, Transaction } from "@/types/domain";

export type SearchExpenseType = "income" | "expense" | "transfer";
export type SearchSortBy = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export interface SearchParams {
  query?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: string[];
  tagIds?: string[];
  groupId?: string;
  memberId?: string;
  type?: SearchExpenseType;
  sortBy?: SearchSortBy;
  page?: number;
  limit?: number;
}

export interface SearchExpenseContext {
  userId: string;
  transactions: Transaction[];
  expenseTags?: ExpenseTag[];
}

export interface SearchResult {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
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

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const uniqueNonEmpty = (values: string[] = []): string[] => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const normalizeText = (value?: string): string => value?.trim().toLowerCase() ?? "";

const normalizePage = (page?: number): number => (Number.isSafeInteger(page) && page && page > 0 ? page : DEFAULT_PAGE);

const normalizeLimit = (limit?: number): number => {
  if (!Number.isSafeInteger(limit) || !limit || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(limit, MAX_LIMIT);
};

const normalizeMinorAmount = (amount?: number): number | undefined => (Number.isSafeInteger(amount) ? amount : undefined);

const parseDateBound = (value?: string, endOfDay = false): number | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }

  return date.getTime();
};

const dateBoundISO = (value?: string, endOfDay = false): string | null => {
  const time = parseDateBound(value, endOfDay);
  return time === null ? null : new Date(time).toISOString();
};

const transactionTime = (transaction: Transaction): number => {
  const value = new Date(transaction.occurredAt).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const compareTransactions = (sortBy: SearchSortBy = "date_desc") => (left: Transaction, right: Transaction): number => {
  switch (sortBy) {
    case "date_asc":
      return transactionTime(left) - transactionTime(right);
    case "amount_desc":
      return right.amountMinor - left.amountMinor || transactionTime(right) - transactionTime(left);
    case "amount_asc":
      return left.amountMinor - right.amountMinor || transactionTime(right) - transactionTime(left);
    case "date_desc":
    default:
      return transactionTime(right) - transactionTime(left);
  }
};

const getExpenseTagMap = (expenseTags: ExpenseTag[] = []): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  expenseTags.forEach((item) => {
    const current = map.get(item.expenseId) ?? new Set<string>();
    current.add(item.tagId);
    map.set(item.expenseId, current);
  });
  return map;
};

const emptyResult = (params: SearchParams): SearchResult => {
  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  return {
    items: [],
    total: 0,
    page,
    limit,
    hasMore: false
  };
};

const mapTransactionRow = (row: TransactionRow): Transaction => ({
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

const resolveTagFilteredExpenseIds = async (tagIds: string[]): Promise<string[] | null> => {
  if (tagIds.length === 0) {
    return null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.from("expense_tags").select("expense_id, tag_id").in("tag_id", tagIds);
  if (error) {
    throw error;
  }

  const tagMap = new Map<string, Set<string>>();
  (data ?? []).forEach((row) => {
    const expenseId = String(row.expense_id);
    const current = tagMap.get(expenseId) ?? new Set<string>();
    current.add(String(row.tag_id));
    tagMap.set(expenseId, current);
  });

  return [...tagMap.entries()].filter(([, tags]) => tagIds.every((tagId) => tags.has(tagId))).map(([expenseId]) => expenseId);
};

/**
 * Applies the same search and filter semantics used by the Supabase path to an in-memory expense collection.
 */
export const searchLocalExpenses = (params: SearchParams, context: SearchExpenseContext): SearchResult => {
  if (params.type === "transfer" || params.groupId || params.memberId) {
    return emptyResult(params);
  }

  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  const offset = (page - 1) * limit;
  const query = normalizeText(params.query);
  const fromTime = parseDateBound(params.fromDate);
  const toTime = parseDateBound(params.toDate, true);
  const minAmount = normalizeMinorAmount(params.minAmount);
  const maxAmount = normalizeMinorAmount(params.maxAmount);
  const categoryIds = uniqueNonEmpty(params.categoryIds);
  const tagIds = uniqueNonEmpty(params.tagIds);
  const tagMap = getExpenseTagMap(context.expenseTags);

  const items = context.transactions
    .filter((transaction) => transaction.ownerId === context.userId && !transaction.deletedAt)
    .filter((transaction) => {
      if (params.type && transaction.type !== params.type) {
        return false;
      }

      if (query) {
        const merchant = normalizeText(transaction.merchant ?? undefined);
        const note = normalizeText(transaction.note ?? undefined);
        if (!merchant.includes(query) && !note.includes(query)) {
          return false;
        }
      }

      const occurredAt = transactionTime(transaction);
      if (fromTime !== null && occurredAt < fromTime) {
        return false;
      }
      if (toTime !== null && occurredAt > toTime) {
        return false;
      }

      if (minAmount !== undefined && transaction.amountMinor < minAmount) {
        return false;
      }
      if (maxAmount !== undefined && transaction.amountMinor > maxAmount) {
        return false;
      }

      if (categoryIds.length > 0 && !categoryIds.includes(transaction.categoryId)) {
        return false;
      }

      if (tagIds.length > 0) {
        const transactionTagIds = tagMap.get(transaction.id) ?? new Set<string>();
        if (!tagIds.every((tagId) => transactionTagIds.has(tagId))) {
          return false;
        }
      }

      return true;
    })
    .sort(compareTransactions(params.sortBy));

  const paginatedItems = items.slice(offset, offset + limit);
  return {
    items: paginatedItems,
    total: items.length,
    page,
    limit,
    hasMore: offset + paginatedItems.length < items.length
  };
};

/**
 * Searches expenses through Supabase when configured, relying on transaction RLS for tenant isolation.
 */
export const searchSupabaseExpenses = async (params: SearchParams): Promise<SearchResult> => {
  if (params.type === "transfer" || params.groupId || params.memberId) {
    return emptyResult(params);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const page = normalizePage(params.page);
  const limit = normalizeLimit(params.limit);
  const offset = (page - 1) * limit;
  const query = params.query?.trim();
  const categoryIds = uniqueNonEmpty(params.categoryIds);
  const tagIds = uniqueNonEmpty(params.tagIds);
  const expenseIds = await resolveTagFilteredExpenseIds(tagIds);

  if (expenseIds && expenseIds.length === 0) {
    return emptyResult({ ...params, page, limit });
  }

  let request = supabase.from("transactions").select("*", { count: "exact" }).is("deleted_at", null);

  if (query) {
    const sanitizedQuery = query.replace(/[,%]/g, " ");
    request = request.or(`merchant.ilike.%${sanitizedQuery}%,note.ilike.%${sanitizedQuery}%`);
  }
  const fromDate = dateBoundISO(params.fromDate);
  const toDate = dateBoundISO(params.toDate, true);
  if (fromDate) {
    request = request.gte("occurred_at", fromDate);
  }
  if (toDate) {
    request = request.lte("occurred_at", toDate);
  }
  if (normalizeMinorAmount(params.minAmount) !== undefined) {
    request = request.gte("amount_minor", params.minAmount!);
  }
  if (normalizeMinorAmount(params.maxAmount) !== undefined) {
    request = request.lte("amount_minor", params.maxAmount!);
  }
  if (params.type) {
    request = request.eq("type", params.type);
  }
  if (categoryIds.length > 0) {
    request = request.in("category_id", categoryIds);
  }
  if (expenseIds) {
    request = request.in("id", expenseIds);
  }

  const sortBy = params.sortBy ?? "date_desc";
  const sortColumn = sortBy.startsWith("amount") ? "amount_minor" : "occurred_at";
  const ascending = sortBy.endsWith("_asc");
  const { data, error, count } = await request.order(sortColumn, { ascending }).range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return {
    items: ((data ?? []) as TransactionRow[]).map(mapTransactionRow),
    total: count ?? 0,
    page,
    limit,
    hasMore: offset + (data?.length ?? 0) < (count ?? 0)
  };
};

/**
 * Searches expenses from Supabase or a provided local context. The local context keeps demo/offline flows deterministic.
 */
export const searchExpenses = async (params: SearchParams, context?: SearchExpenseContext): Promise<SearchResult> => {
  if (context) {
    return searchLocalExpenses(params, context);
  }

  return searchSupabaseExpenses(params);
};

/**
 * Counts active filters for badges and chip rendering.
 */
export const countActiveSearchFilters = (params: SearchParams): number => {
  let count = 0;
  if (normalizeText(params.query)) count += 1;
  if (params.fromDate || params.toDate) count += 1;
  if (normalizeMinorAmount(params.minAmount) !== undefined || normalizeMinorAmount(params.maxAmount) !== undefined) count += 1;
  if (params.type) count += 1;
  if (uniqueNonEmpty(params.categoryIds).length > 0) count += 1;
  if (uniqueNonEmpty(params.tagIds).length > 0) count += 1;
  if (params.groupId) count += 1;
  if (params.memberId) count += 1;
  return count;
};
