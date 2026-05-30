import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Papa from "papaparse";

import { getSupabaseClient } from "@/lib/supabase";
import { formatMoney } from "@/lib/money";
import { getCurrencyMinorUnit } from "@/lib/currencies";
import type {
  Category,
  CurrencyCode,
  ExpenseTag,
  GroupExpense,
  GroupExpenseSplit,
  Settlement,
  SplitGroup,
  SplitMember,
  SplitMethod,
  Tag,
  Transaction
} from "@/types/domain";

export type ExportScope = "personal" | "group" | "all";
export type ExportFormat = "csv" | "pdf";

export interface ExportParams {
  scope: ExportScope;
  format: ExportFormat;
  fromDate?: string;
  toDate?: string;
  categoryIds?: string[];
  tagIds?: string[];
  groupId?: string;
  includeSettlements?: boolean;
}

export interface ExportContext {
  transactions: Transaction[];
  categories: Category[];
  tags: Tag[];
  expenseTags: ExpenseTag[];
  groups: SplitGroup[];
  groupExpenses: GroupExpense[];
  settlements: Settlement[];
}

export interface ExportPersonalExpenseRow {
  id: string;
  date: string;
  type: Transaction["type"];
  category: string;
  tags: string[];
  merchantOrDescription: string;
  amountMinor: number;
  currency: CurrencyCode;
  note: string;
}

export interface ExportGroupExpenseRow {
  id: string;
  date: string;
  group: string;
  payer: string;
  participants: string[];
  splitMethod: SplitMethod;
  category: string;
  tags: string[];
  totalAmountMinor: number;
  yourShareMinor: number;
  currency: CurrencyCode;
  note: string;
}

export interface ExportSettlementRow {
  id: string;
  date: string;
  group: string;
  from: string;
  to: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: Settlement["status"];
}

export interface ExportSummary {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  netMinor: number;
  transactionCount: number;
}

export interface ExportData {
  scope: ExportScope;
  generatedAt: string;
  personalExpenses: ExportPersonalExpenseRow[];
  groupExpenses: ExportGroupExpenseRow[];
  settlements: ExportSettlementRow[];
  summary: ExportSummary;
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
  user_id?: string | null;
  name: string;
  kind: Category["kind"];
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  is_system: boolean | null;
  is_default?: boolean | null;
  is_archived?: boolean | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

interface TagRow {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  is_archived: boolean | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
}

interface ExpenseTagRow {
  expense_id: string;
  tag_id: string;
  created_at: string;
  created_by: string;
}

interface GroupMemberRow {
  id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  role: SplitMember["role"];
  created_at?: string;
  updated_at?: string;
  deleted_at: string | null;
}

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  type: SplitGroup["type"];
  currency: CurrencyCode;
  budget_minor: number | string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
  group_members?: GroupMemberRow[];
}

interface GroupExpenseSplitRow {
  member_id: string;
  amount_minor: number | string;
  percentage_bps: number | null;
  shares: number | string | null;
  excluded: boolean | null;
}

interface GroupExpenseRow {
  id: string;
  group_id: string;
  title: string;
  amount_minor: number | string;
  currency: CurrencyCode;
  paid_by_member_id: string;
  split_method: SplitMethod;
  occurred_at: string;
  receipt_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
  group_expense_splits?: GroupExpenseSplitRow[];
}

interface SettlementRow {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount_minor: number | string;
  currency: CurrencyCode;
  status: Settlement["status"];
  payment_reference: string | null;
  note: string | null;
  proof_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
}

const PERSONAL_FIELDS = ["Date", "Type", "Category", "Tags", "Merchant/Description", "Amount", "Currency", "Note"];
const GROUP_FIELDS = ["Date", "Group", "Payer", "Participants", "Split Method", "Category", "Tags", "Total Amount", "Your Share", "Note"];
const SETTLEMENT_FIELDS = ["Date", "Group", "From", "To", "Amount", "Status"];

const uniqueNonEmpty = (values: string[] = []): string[] => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const safeText = (value?: string | null): string => value?.trim() ?? "";

const dateKey = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const isoDateBoundary = (value: string | undefined, endOfDay = false): string | null => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value.slice(0, 10)}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isDateInRange = (value: string, fromDate?: string, toDate?: string): boolean => {
  const current = dateKey(value);
  if (fromDate && current < fromDate.slice(0, 10)) {
    return false;
  }
  if (toDate && current > toDate.slice(0, 10)) {
    return false;
  }
  return true;
};

const isPersonalScope = (scope: ExportScope): boolean => scope === "personal" || scope === "all";

const isGroupScope = (scope: ExportScope): boolean => scope === "group" || scope === "all";

const categoryName = (categoryId: string, categories: Category[]): string =>
  categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";

const tagsByExpense = (expenseId: string, tags: Tag[], expenseTags: ExpenseTag[]): string[] => {
  const tagIds = new Set(expenseTags.filter((item) => item.expenseId === expenseId).map((item) => item.tagId));
  return tags.filter((tag) => tagIds.has(tag.id)).map((tag) => tag.name);
};

const hasAllTags = (expenseId: string, selectedTagIds: string[], expenseTags: ExpenseTag[]): boolean => {
  if (selectedTagIds.length === 0) {
    return true;
  }

  const tagIds = new Set(expenseTags.filter((item) => item.expenseId === expenseId).map((item) => item.tagId));
  return selectedTagIds.every((tagId) => tagIds.has(tagId));
};

const memberName = (members: SplitMember[], memberId: string): string =>
  members.find((member) => member.id === memberId)?.displayName ?? "Unknown";

const currentMember = (group: SplitGroup, userId: string): SplitMember | undefined =>
  group.members.find((member) => member.userId === userId) ?? group.members.find((member) => member.isCurrentUser) ?? group.members[0];

const participantNames = (expense: GroupExpense, group: SplitGroup): string[] =>
  expense.splits
    .filter((split) => !split.excluded)
    .map((split) => memberName(group.members, split.memberId))
    .filter(Boolean);

const yourShareMinor = (expense: GroupExpense, group: SplitGroup, userId: string): number => {
  const member = currentMember(group, userId);
  if (!member) {
    return 0;
  }

  return expense.splits.find((split) => split.memberId === member.id)?.amountMinor ?? 0;
};

const filterPersonalTransactions = (userId: string, params: ExportParams, context: ExportContext): Transaction[] => {
  const categoryIds = uniqueNonEmpty(params.categoryIds);
  const tagIds = uniqueNonEmpty(params.tagIds);

  return context.transactions
    .filter((transaction) => transaction.ownerId === userId && !transaction.deletedAt)
    .filter((transaction) => isDateInRange(transaction.occurredAt, params.fromDate, params.toDate))
    .filter((transaction) => categoryIds.length === 0 || categoryIds.includes(transaction.categoryId))
    .filter((transaction) => hasAllTags(transaction.id, tagIds, context.expenseTags))
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
};

const filterGroupExpenses = (params: ExportParams, context: ExportContext): GroupExpense[] =>
  context.groupExpenses
    .filter((expense) => !expense.deletedAt)
    .filter((expense) => !params.groupId || expense.groupId === params.groupId)
    .filter((expense) => isDateInRange(expense.occurredAt, params.fromDate, params.toDate))
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

const filterSettlements = (params: ExportParams, context: ExportContext): Settlement[] =>
  context.settlements
    .filter((settlement) => !settlement.deletedAt)
    .filter((settlement) => !params.groupId || settlement.groupId === params.groupId)
    .filter((settlement) => isDateInRange(settlement.createdAt, params.fromDate, params.toDate))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

const buildPersonalRows = (transactions: Transaction[], context: ExportContext): ExportPersonalExpenseRow[] =>
  transactions.map((transaction) => ({
    id: transaction.id,
    date: dateKey(transaction.occurredAt),
    type: transaction.type,
    category: categoryName(transaction.categoryId, context.categories),
    tags: tagsByExpense(transaction.id, context.tags, context.expenseTags),
    merchantOrDescription: safeText(transaction.merchant) || safeText(transaction.note) || "Transaction",
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    note: safeText(transaction.note)
  }));

const buildGroupRows = (userId: string, expenses: GroupExpense[], context: ExportContext): ExportGroupExpenseRow[] =>
  expenses.flatMap((expense) => {
    const group = context.groups.find((item) => item.id === expense.groupId);
    if (!group || group.deletedAt) {
      return [];
    }

    return [
      {
        id: expense.id,
        date: dateKey(expense.occurredAt),
        group: group.name,
        payer: memberName(group.members, expense.paidByMemberId),
        participants: participantNames(expense, group),
        splitMethod: expense.splitMethod,
        category: "",
        tags: [],
        totalAmountMinor: expense.amountMinor,
        yourShareMinor: yourShareMinor(expense, group, userId),
        currency: expense.currency,
        note: expense.title
      }
    ];
  });

const buildSettlementRows = (settlements: Settlement[], context: ExportContext): ExportSettlementRow[] =>
  settlements.flatMap((settlement) => {
    const group = context.groups.find((item) => item.id === settlement.groupId);
    if (!group || group.deletedAt) {
      return [];
    }

    return [
      {
        id: settlement.id,
        date: dateKey(settlement.createdAt),
        group: group.name,
        from: memberName(group.members, settlement.fromMemberId),
        to: memberName(group.members, settlement.toMemberId),
        amountMinor: settlement.amountMinor,
        currency: settlement.currency,
        status: settlement.status
      }
    ];
  });

const buildSummary = (personalExpenses: ExportPersonalExpenseRow[], groupExpenses: ExportGroupExpenseRow[]): ExportSummary => {
  const totalIncomeMinor = personalExpenses.filter((expense) => expense.type === "income").reduce((total, expense) => total + expense.amountMinor, 0);
  const personalExpenseMinor = personalExpenses.filter((expense) => expense.type === "expense").reduce((total, expense) => total + expense.amountMinor, 0);
  const groupExpenseMinor = groupExpenses.reduce((total, expense) => total + expense.yourShareMinor, 0);
  const totalExpenseMinor = personalExpenseMinor + groupExpenseMinor;

  return {
    totalIncomeMinor,
    totalExpenseMinor,
    netMinor: totalIncomeMinor - totalExpenseMinor,
    transactionCount: personalExpenses.length + groupExpenses.length
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

const mapCategoryRow = (row: CategoryRow, userId: string): Category => ({
  id: row.id,
  ownerId: row.user_id ?? row.owner_id ?? userId,
  name: row.name,
  kind: row.kind,
  icon: row.icon ?? "pricetag",
  color: row.color ?? "#6B7280",
  parentId: row.parent_id,
  isSystem: Boolean(row.is_system),
  isDefault: Boolean(row.is_default),
  isArchived: Boolean(row.is_archived),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by ?? userId,
  updatedBy: row.updated_by
});

const mapTagRow = (row: TagRow): Tag => ({
  id: row.id,
  ownerId: row.user_id,
  name: row.name,
  color: row.color ?? "#0F766E",
  isArchived: Boolean(row.is_archived),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by
});

const mapExpenseTagRow = (row: ExpenseTagRow): ExpenseTag => ({
  expenseId: row.expense_id,
  tagId: row.tag_id,
  createdAt: row.created_at,
  createdBy: row.created_by
});

const mapMemberRow = (row: GroupMemberRow, userId: string): SplitMember => ({
  id: row.id,
  userId: row.user_id,
  displayName: row.display_name,
  email: row.email,
  role: row.role,
  isCurrentUser: row.user_id === userId,
  deletedAt: row.deleted_at
});

const mapGroupRow = (row: GroupRow, userId: string): SplitGroup => ({
  id: row.id,
  name: row.name,
  description: row.description,
  type: row.type,
  currency: row.currency,
  budgetMinor: row.budget_minor === null ? null : Number(row.budget_minor),
  members: (row.group_members ?? []).filter((member) => !member.deleted_at).map((member) => mapMemberRow(member, userId)),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by
});

const mapSplitRow = (row: GroupExpenseSplitRow): GroupExpenseSplit => ({
  memberId: row.member_id,
  amountMinor: Number(row.amount_minor),
  percentageBps: row.percentage_bps ?? undefined,
  shares: row.shares === null ? undefined : Number(row.shares),
  excluded: Boolean(row.excluded)
});

const mapGroupExpenseRow = (row: GroupExpenseRow): GroupExpense => ({
  id: row.id,
  groupId: row.group_id,
  title: row.title,
  amountMinor: Number(row.amount_minor),
  currency: row.currency,
  paidByMemberId: row.paid_by_member_id,
  splitMethod: row.split_method,
  occurredAt: row.occurred_at,
  receiptId: row.receipt_id,
  splits: (row.group_expense_splits ?? []).map(mapSplitRow),
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by
});

const mapSettlementRow = (row: SettlementRow): Settlement => ({
  id: row.id,
  groupId: row.group_id,
  fromMemberId: row.from_member_id,
  toMemberId: row.to_member_id,
  amountMinor: Number(row.amount_minor),
  currency: row.currency,
  status: row.status,
  paymentReference: row.payment_reference,
  note: row.note,
  proofPath: row.proof_path,
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
  ((data ?? []) as ExpenseTagRow[]).forEach((row) => {
    const current = tagMap.get(row.expense_id) ?? new Set<string>();
    current.add(row.tag_id);
    tagMap.set(row.expense_id, current);
  });

  return [...tagMap.entries()].filter(([, tags]) => tagIds.every((tagId) => tags.has(tagId))).map(([expenseId]) => expenseId);
};

const fetchSupabaseContext = async (userId: string, params: ExportParams): Promise<ExportContext> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const categoryIds = uniqueNonEmpty(params.categoryIds);
  const tagIds = uniqueNonEmpty(params.tagIds);
  const tagFilteredExpenseIds = await resolveTagFilteredExpenseIds(tagIds);

  let transactionRequest = supabase.from("transactions").select("*").eq("owner_id", userId).is("deleted_at", null);
  const fromDate = isoDateBoundary(params.fromDate);
  const toDate = isoDateBoundary(params.toDate, true);
  if (fromDate) {
    transactionRequest = transactionRequest.gte("occurred_at", fromDate);
  }
  if (toDate) {
    transactionRequest = transactionRequest.lte("occurred_at", toDate);
  }
  if (categoryIds.length > 0) {
    transactionRequest = transactionRequest.in("category_id", categoryIds);
  }
  if (tagFilteredExpenseIds) {
    if (tagFilteredExpenseIds.length === 0) {
      transactionRequest = transactionRequest.in("id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      transactionRequest = transactionRequest.in("id", tagFilteredExpenseIds);
    }
  }

  const [
    transactionsResult,
    categoriesResult,
    tagsResult,
    expenseTagsResult,
    groupsResult
  ] = await Promise.all([
    isPersonalScope(params.scope) ? transactionRequest.order("occurred_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId},owner_id.eq.${userId}`)
      .is("deleted_at", null),
    supabase.from("tags").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("expense_tags").select("*"),
    isGroupScope(params.scope)
      ? supabase
          .from("groups")
          .select("*, group_members(*)")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ]);

  const firstError = transactionsResult.error ?? categoriesResult.error ?? tagsResult.error ?? expenseTagsResult.error ?? groupsResult.error;
  if (firstError) {
    throw firstError;
  }

  const groups = ((groupsResult.data ?? []) as GroupRow[]).map((row) => mapGroupRow(row, userId)).filter((group) => !params.groupId || group.id === params.groupId);
  const groupIds = groups.map((group) => group.id);

  let groupExpenses: GroupExpense[] = [];
  let settlements: Settlement[] = [];
  if (groupIds.length > 0) {
    let groupExpenseRequest = supabase.from("group_expenses").select("*, group_expense_splits(*)").in("group_id", groupIds).is("deleted_at", null);
    if (fromDate) {
      groupExpenseRequest = groupExpenseRequest.gte("occurred_at", fromDate);
    }
    if (toDate) {
      groupExpenseRequest = groupExpenseRequest.lte("occurred_at", toDate);
    }
    const { data, error } = await groupExpenseRequest.order("occurred_at", { ascending: false });
    if (error) {
      throw error;
    }
    groupExpenses = ((data ?? []) as GroupExpenseRow[]).map(mapGroupExpenseRow);

    if (params.includeSettlements) {
      let settlementRequest = supabase.from("settlements").select("*").in("group_id", groupIds).is("deleted_at", null);
      if (fromDate) {
        settlementRequest = settlementRequest.gte("created_at", fromDate);
      }
      if (toDate) {
        settlementRequest = settlementRequest.lte("created_at", toDate);
      }
      const result = await settlementRequest.order("created_at", { ascending: false });
      if (result.error) {
        throw result.error;
      }
      settlements = ((result.data ?? []) as SettlementRow[]).map(mapSettlementRow);
    }
  }

  return {
    transactions: ((transactionsResult.data ?? []) as TransactionRow[]).map(mapTransactionRow),
    categories: ((categoriesResult.data ?? []) as CategoryRow[]).map((row) => mapCategoryRow(row, userId)),
    tags: ((tagsResult.data ?? []) as TagRow[]).map(mapTagRow),
    expenseTags: ((expenseTagsResult.data ?? []) as ExpenseTagRow[]).map(mapExpenseTagRow),
    groups,
    groupExpenses,
    settlements
  };
};

/**
 * Builds export rows from the local/demo state. This is also used by tests and row-count estimation.
 */
export const getLocalExportData = (userId: string, params: ExportParams, context: ExportContext): ExportData => {
  const personalExpenses = isPersonalScope(params.scope) ? buildPersonalRows(filterPersonalTransactions(userId, params, context), context) : [];
  const groupExpenses = isGroupScope(params.scope) ? buildGroupRows(userId, filterGroupExpenses(params, context), context) : [];
  const settlements = isGroupScope(params.scope) && params.includeSettlements ? buildSettlementRows(filterSettlements(params, context), context) : [];
  const summary = buildSummary(personalExpenses, groupExpenses);

  return {
    scope: params.scope,
    generatedAt: new Date().toISOString(),
    personalExpenses,
    groupExpenses,
    settlements,
    summary
  };
};

/**
 * Fetches export data for the requested scope. Supabase mode keeps explicit user filters in addition to RLS.
 */
export const getExportData = async (userId: string, params: ExportParams, context?: ExportContext): Promise<ExportData> => {
  if (context) {
    return getLocalExportData(userId, params, context);
  }

  const supabaseContext = await fetchSupabaseContext(userId, params);
  return getLocalExportData(userId, params, supabaseContext);
};

export const minorToHumanAmount = (amountMinor: number, currency: CurrencyCode): string => {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("Money amounts must be safe integers in minor units.");
  }

  const sign = amountMinor < 0 ? "-" : "";
  const absolute = Math.abs(amountMinor);
  const fractionDigits = getCurrencyMinorUnit(currency);
  const scale = 10 ** fractionDigits;
  const major = Math.floor(absolute / scale);
  const fraction = absolute % scale;

  if (fractionDigits === 0) {
    return `${sign}${major}`;
  }

  return `${sign}${major}.${String(fraction).padStart(fractionDigits, "0")}`;
};

const unparseSection = (fields: string[], data: Record<string, string>[]): string => Papa.unparse({ fields, data }, { newline: "\n" });

const personalCsvRows = (rows: ExportPersonalExpenseRow[]): Record<string, string>[] =>
  rows.map((row) => ({
    Date: row.date,
    Type: row.type,
    Category: row.category,
    Tags: row.tags.join(", "),
    "Merchant/Description": row.merchantOrDescription,
    Amount: minorToHumanAmount(row.amountMinor, row.currency),
    Currency: row.currency,
    Note: row.note
  }));

const groupCsvRows = (rows: ExportGroupExpenseRow[]): Record<string, string>[] =>
  rows.map((row) => ({
    Date: row.date,
    Group: row.group,
    Payer: row.payer,
    Participants: row.participants.join(", "),
    "Split Method": row.splitMethod,
    Category: row.category,
    Tags: row.tags.join(", "),
    "Total Amount": minorToHumanAmount(row.totalAmountMinor, row.currency),
    "Your Share": minorToHumanAmount(row.yourShareMinor, row.currency),
    Note: row.note
  }));

const settlementCsvRows = (rows: ExportSettlementRow[]): Record<string, string>[] =>
  rows.map((row) => ({
    Date: row.date,
    Group: row.group,
    From: row.from,
    To: row.to,
    Amount: minorToHumanAmount(row.amountMinor, row.currency),
    Status: row.status
  }));

/**
 * Formats export rows as CSV, escaping all values through Papa Parse.
 */
export const formatAsCSV = (data: ExportData): string => {
  if (data.personalExpenses.length === 0 && data.groupExpenses.length === 0 && data.settlements.length === 0) {
    return unparseSection(data.scope === "group" ? GROUP_FIELDS : PERSONAL_FIELDS, []);
  }

  const sections: string[] = [];
  if (data.personalExpenses.length > 0 || data.scope !== "group") {
    sections.push(unparseSection(PERSONAL_FIELDS, personalCsvRows(data.personalExpenses)));
  }
  if (data.groupExpenses.length > 0) {
    sections.push(["Group Expenses", unparseSection(GROUP_FIELDS, groupCsvRows(data.groupExpenses))].join("\n"));
  }
  if (data.settlements.length > 0) {
    sections.push(["Settlements", unparseSection(SETTLEMENT_FIELDS, settlementCsvRows(data.settlements))].join("\n"));
  }

  return sections.join("\n\n");
};

const htmlEscape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const style = (rules: Record<string, string | number>): string =>
  Object.entries(rules)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");

const renderTable = (headers: string[], rows: string[][]): string => {
  if (rows.length === 0) {
    return `<p style="${style({ color: "#6B7280", "font-size": "12px", margin: "8px 0 20px" })}">No transactions</p>`;
  }

  return `<table style="${style({ width: "100%", "border-collapse": "collapse", "margin-bottom": "24px", "font-size": "11px" })}">
    <thead>
      <tr>
        ${headers.map((header) => `<th style="${style({ border: "1px solid #D1D5DB", padding: "8px", "background-color": "#F3F4F6", "text-align": "left" })}">${htmlEscape(header)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row, index) =>
            `<tr style="${style({ "background-color": index % 2 === 0 ? "#FFFFFF" : "#F9FAFB" })}">${row
              .map((cell) => `<td style="${style({ border: "1px solid #E5E7EB", padding: "8px", "vertical-align": "top" })}">${htmlEscape(cell)}</td>`)
              .join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>`;
};

const dateRangeLabel = (params: ExportParams): string => {
  if (params.fromDate && params.toDate) {
    return `${params.fromDate.slice(0, 10)} to ${params.toDate.slice(0, 10)}`;
  }
  if (params.fromDate) {
    return `From ${params.fromDate.slice(0, 10)}`;
  }
  if (params.toDate) {
    return `Until ${params.toDate.slice(0, 10)}`;
  }
  return "All dates";
};

export const buildExportHTML = (data: ExportData, params: ExportParams): string => {
  const currency = data.personalExpenses[0]?.currency ?? data.groupExpenses[0]?.currency ?? data.settlements[0]?.currency ?? "INR";
  const pageStyle = style({ "font-family": "Arial, sans-serif", color: "#111827", padding: "24px" });
  const headingStyle = style({ margin: "0 0 4px", "font-size": "24px", "font-weight": 700 });
  const subtextStyle = style({ margin: "0", color: "#6B7280", "font-size": "12px" });
  const sectionHeadingStyle = style({ "font-size": "16px", margin: "24px 0 10px", "font-weight": 700 });
  const summaryCardStyle = style({ display: "inline-block", width: "23%", "margin-right": "1%", padding: "10px", border: "1px solid #E5E7EB", "border-radius": "8px" });
  const summaryLabelStyle = style({ color: "#6B7280", "font-size": "10px", "text-transform": "uppercase", margin: "0 0 4px" });
  const summaryValueStyle = style({ "font-size": "14px", "font-weight": 700, margin: 0 });

  const personalRows = data.personalExpenses.map((row) => [
    row.date,
    row.type,
    row.category,
    row.tags.join(", "),
    row.merchantOrDescription,
    minorToHumanAmount(row.amountMinor, row.currency),
    row.currency,
    row.note
  ]);
  const groupRows = data.groupExpenses.map((row) => [
    row.date,
    row.group,
    row.payer,
    row.participants.join(", "),
    row.splitMethod,
    row.category,
    row.tags.join(", "),
    minorToHumanAmount(row.totalAmountMinor, row.currency),
    minorToHumanAmount(row.yourShareMinor, row.currency),
    row.note
  ]);
  const settlementRows = data.settlements.map((row) => [row.date, row.group, row.from, row.to, minorToHumanAmount(row.amountMinor, row.currency), row.status]);

  return `<!doctype html>
  <html>
    <head><meta charset="utf-8"><title>PocketSplit Export</title></head>
    <body style="${pageStyle}">
      <header style="${style({ "border-bottom": "2px solid #111827", "padding-bottom": "12px", "margin-bottom": "18px" })}">
        <h1 style="${headingStyle}">PocketSplit Export</h1>
        <p style="${subtextStyle}">Exported ${dateKey(data.generatedAt)} • ${params.scope} • ${dateRangeLabel(params)}</p>
      </header>

      <section>
        <div style="${summaryCardStyle}">
          <p style="${summaryLabelStyle}">Total income</p>
          <p style="${summaryValueStyle}">${htmlEscape(formatMoney(data.summary.totalIncomeMinor, currency))}</p>
        </div>
        <div style="${summaryCardStyle}">
          <p style="${summaryLabelStyle}">Total expense</p>
          <p style="${summaryValueStyle}">${htmlEscape(formatMoney(data.summary.totalExpenseMinor, currency))}</p>
        </div>
        <div style="${summaryCardStyle}">
          <p style="${summaryLabelStyle}">Net</p>
          <p style="${summaryValueStyle}">${htmlEscape(formatMoney(data.summary.netMinor, currency))}</p>
        </div>
        <div style="${summaryCardStyle}">
          <p style="${summaryLabelStyle}">Transactions</p>
          <p style="${summaryValueStyle}">${data.summary.transactionCount}</p>
        </div>
      </section>

      ${params.scope !== "group" ? `<h2 style="${sectionHeadingStyle}">Personal expenses</h2>${renderTable(PERSONAL_FIELDS, personalRows)}` : ""}
      ${isGroupScope(params.scope) ? `<h2 style="${sectionHeadingStyle}">Group expenses</h2>${renderTable(GROUP_FIELDS, groupRows)}` : ""}
      ${params.includeSettlements ? `<h2 style="${sectionHeadingStyle}">Settlements</h2>${renderTable(SETTLEMENT_FIELDS, settlementRows)}` : ""}
    </body>
  </html>`;
};

/**
 * Converts export data to a local PDF file URI using Expo Print.
 */
export const formatAsPDF = async (data: ExportData, params: ExportParams): Promise<string> => {
  const { uri } = await Print.printToFileAsync({
    html: buildExportHTML(data, params),
    base64: false
  });

  return uri;
};

export const createExportFilename = (format: ExportFormat, date = new Date()): string => {
  const pad2 = (value: number): string => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  return `expenses_${stamp}.${format}`;
};

export const writeTextExportFile = async (contents: string, filename: string): Promise<string> => {
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error("File cache is not available on this device.");
  }

  const uri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
};

/**
 * Copies the generated export into Expo cache and opens the native share sheet.
 */
export const saveAndShareFile = async (uri: string, filename: string, mimeType: string): Promise<void> => {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Sharing is not available on this device.");
  }

  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    throw new Error("File cache is not available on this device.");
  }

  const destinationUri = `${directory}${filename}`;
  if (uri !== destinationUri) {
    await FileSystem.copyAsync({ from: uri, to: destinationUri });
  }

  await Sharing.shareAsync(destinationUri, {
    mimeType,
    dialogTitle: filename,
    UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text"
  });
};
