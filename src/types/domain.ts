import type { SupportedCurrencyCode } from "@/lib/currencies";

export type CurrencyCode = SupportedCurrencyCode;

export type MoneyPulseStatus =
  | "healthy"
  | "caution"
  | "overspending"
  | "saving_mode"
  | "bill_heavy_month";

export type WalletType = "cash" | "bank" | "card" | "upi" | "credit_card" | "loan";

export type TransactionType = "income" | "expense";

export type CategoryKind = "income" | "expense";

export type SplitGroupType =
  | "trip"
  | "roommates"
  | "couple"
  | "family"
  | "office"
  | "event"
  | "business"
  | "other";

export type SplitMethod =
  | "equal"
  | "exact"
  | "percentage"
  | "shares"
  | "itemwise"
  | "custom";

export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

export type RecurringBillStatus = "active" | "paused" | "cancelled";

export type SavingsGoalStatus = "active" | "paused" | "completed" | "archived";

export type AuthMode = "local" | "supabase";

export type PlanId = "free" | "pro_monthly" | "pro_yearly" | "premium_monthly" | "premium_yearly";

export type FeatureName =
  | "manual_expense"
  | "custom_categories"
  | "receipt_scan"
  | "ai_categorization"
  | "ai_assistant"
  | "advanced_reports"
  | "pdf_export"
  | "split_group"
  | "group_expense"
  | "advanced_split"
  | "smart_settlement"
  | "payment_reminder"
  | "data_export";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  createdBy: string;
  updatedBy?: string | null;
}

export interface Profile extends BaseEntity {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  currency: CurrencyCode;
  biometricEnabled: boolean;
}

export interface Wallet extends BaseEntity {
  ownerId: string;
  name: string;
  type: WalletType;
  currency: CurrencyCode;
  balanceMinor: number;
}

export interface Category extends BaseEntity {
  ownerId: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  parentId?: string | null;
  isSystem: boolean;
  isArchived?: boolean;
  isDefault?: boolean;
}

export interface Tag extends BaseEntity {
  ownerId: string;
  name: string;
  color: string;
  isArchived?: boolean;
}

export interface ExpenseTag {
  expenseId: string;
  tagId: string;
  createdAt: string;
  createdBy: string;
}

export interface Transaction extends BaseEntity {
  ownerId: string;
  walletId: string;
  categoryId: string;
  type: TransactionType;
  amountMinor: number;
  currency: CurrencyCode;
  merchant?: string | null;
  note?: string | null;
  occurredAt: string;
  receiptId?: string | null;
  isRecurring?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Budget extends BaseEntity {
  ownerId: string;
  categoryId: string;
  month: string;
  amountMinor: number;
  currency: CurrencyCode;
}

export interface MonthlySpendingPlan extends BaseEntity {
  ownerId: string;
  month: string;
  allocatedSpendMinor: number;
  currency: CurrencyCode;
}

export interface RecurringBill extends BaseEntity {
  ownerId: string;
  name: string;
  amountMinor: number;
  currency: CurrencyCode;
  categoryId: string;
  walletId?: string | null;
  frequency: RecurringFrequency;
  nextDueAt: string;
  remindDaysBefore: number;
  autoCreateExpense: boolean;
  status: RecurringBillStatus;
  lastPaidAt?: string | null;
  merchant?: string | null;
  note?: string | null;
}

export interface SavingsGoal extends BaseEntity {
  ownerId: string;
  name: string;
  targetAmountMinor: number;
  savedAmountMinor: number;
  currency: CurrencyCode;
  targetDate: string;
  monthlyContributionMinor: number;
  status: SavingsGoalStatus;
  note?: string | null;
}

export interface SavingsGoalContribution extends BaseEntity {
  ownerId: string;
  goalId: string;
  amountMinor: number;
  currency: CurrencyCode;
  contributedAt: string;
  note?: string | null;
}

export interface Receipt extends BaseEntity {
  ownerId: string;
  storagePath: string;
  merchant?: string | null;
  totalAmountMinor?: number | null;
  taxAmountMinor?: number | null;
  serviceChargeMinor?: number | null;
  currency: CurrencyCode;
  parsedStatus: "pending" | "parsed" | "failed";
  parsedItems: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  label: string;
  amountMinor: number;
  quantity: number;
  assignedMemberIds?: string[];
}

export interface AiInsight extends BaseEntity {
  ownerId: string;
  title: string;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  suggestions: string[];
}

export interface SplitMember {
  id: string;
  userId?: string | null;
  displayName: string;
  email?: string | null;
  role: "admin" | "member";
  isCurrentUser?: boolean;
  deletedAt?: string | null;
}

export interface SplitGroup extends BaseEntity {
  name: string;
  description?: string | null;
  type: SplitGroupType;
  currency: CurrencyCode;
  budgetMinor?: number | null;
  members: SplitMember[];
}

export interface GroupExpense extends BaseEntity {
  groupId: string;
  title: string;
  amountMinor: number;
  currency: CurrencyCode;
  paidByMemberId: string;
  splitMethod: SplitMethod;
  occurredAt: string;
  receiptId?: string | null;
  splits: GroupExpenseSplit[];
  version: number;
}

export interface GroupExpenseSplit {
  memberId: string;
  amountMinor: number;
  percentageBps?: number;
  shares?: number;
  excluded?: boolean;
}

export interface Settlement extends BaseEntity {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
  currency: CurrencyCode;
  status: "pending" | "paid" | "confirmed" | "disputed";
  paymentReference?: string | null;
  note?: string | null;
  proofPath?: string | null;
}

export interface ActivityLog extends BaseEntity {
  actorId: string;
  groupId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export interface EntitlementState {
  planId: PlanId;
  activeUntil?: string | null;
  usage: Partial<Record<FeatureName, number>>;
}
