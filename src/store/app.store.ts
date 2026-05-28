import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createSystemCategories, createSystemWallets, DEFAULT_CURRENCY, DEMO_USER_ID } from "@/lib/constants";
import { endOfMonthISO, monthKey, startOfMonthISO } from "@/lib/dates";
import { DEFAULT_APP_LANGUAGE, isSupportedAppLanguageCode, type AppLanguageCode } from "@/lib/languages";
import { calculateBudgetUsage, calculateMoneyPulse, calculateMonthlySpendPlan, calculateSafeDailySpend } from "@/lib/money";
import { calculateGroupBalances } from "@/lib/split";
import { applyTransactionReplacement, applyTransactionWalletEffect, recalculateWalletBalances, sumCategorySpend } from "@/lib/transaction-ledger";
import { consumeUsage, getDefaultPlanForAuthMode } from "@/services/entitlement.service";
import { getExpectedBillsMinorForMonth, getUpcomingBills, markRecurringBillPaid, updateRecurringBillStatus, type UpcomingBill } from "@/services/recurring-bill.service";
import {
  applySavingsGoalContribution,
  createSavingsGoalContribution,
  getMonthlySavingsReserveMinor,
  updateSavingsGoalStatus
} from "@/services/savings-goal.service";
import type {
  ActivityLog,
  AiInsight,
  AuthMode,
  Budget,
  Category,
  EntitlementState,
  FeatureName,
  GroupExpense,
  MonthlySpendingPlan,
  Profile,
  RecurringBill,
  RecurringBillStatus,
  Receipt,
  SavingsGoal,
  SavingsGoalContribution,
  SavingsGoalStatus,
  Settlement,
  SplitGroup,
  Transaction,
  Wallet
} from "@/types/domain";

type DomainCollections = Pick<
  AppState,
  | "wallets"
  | "categories"
  | "transactions"
  | "budgets"
  | "monthlySpendingPlans"
  | "recurringBills"
  | "savingsGoals"
  | "savingsGoalContributions"
  | "receipts"
  | "aiInsights"
  | "groups"
  | "groupExpenses"
  | "settlements"
  | "activityLogs"
>;

interface DashboardSnapshot {
  incomeMinor: number;
  expenseMinor: number;
  availableMinor: number;
  allocatedSpendMinor: number;
  committedSpendMinor: number;
  spendRemainingMinor: number;
  plannedSavingsMinor: number;
  overspendMinor: number;
  hasSpendAllocation: boolean;
  safeDailySpendMinor: number;
  expectedBillsMinor: number;
  savingsReserveMinor: number;
  pulseStatus: ReturnType<typeof calculateMoneyPulse>;
}

export type ThemeMode = "system" | "light" | "dark";

export interface AppState {
  profile: Profile;
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  monthlySpendingPlans: MonthlySpendingPlan[];
  recurringBills: RecurringBill[];
  savingsGoals: SavingsGoal[];
  savingsGoalContributions: SavingsGoalContribution[];
  receipts: Receipt[];
  aiInsights: AiInsight[];
  groups: SplitGroup[];
  groupExpenses: GroupExpense[];
  settlements: Settlement[];
  activityLogs: ActivityLog[];
  entitlement: EntitlementState;
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;
  authMode: AuthMode | null;
  themeMode: ThemeMode;
  appLanguage: AppLanguageCode;
  markOnboardingSeen: () => void;
  completeAuthenticatedSession: (profile: Profile, authMode: AuthMode) => void;
  selectFreePlan: () => void;
  endSession: () => void;
  sanitizeLegacyDemoData: () => void;
  setProfile: (profile: Profile) => void;
  setCurrency: (currency: Profile["currency"]) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setAppLanguage: (appLanguage: AppLanguageCode) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (transactionId: string) => void;
  addBudget: (budget: Budget) => void;
  setMonthlySpendingPlan: (allocatedSpendMinor: number, month?: string) => void;
  addRecurringBill: (bill: RecurringBill) => void;
  markRecurringBillPaid: (billId: string) => void;
  updateRecurringBillStatus: (billId: string, status: RecurringBillStatus) => void;
  addSavingsGoal: (goal: SavingsGoal) => void;
  addSavingsGoalContribution: (goalId: string, amountMinor?: number) => void;
  updateSavingsGoalStatus: (goalId: string, status: SavingsGoalStatus) => void;
  addReceipt: (receipt: Receipt) => void;
  addGroup: (group: SplitGroup) => void;
  addGroupExpense: (expense: GroupExpense) => void;
  addSettlement: (settlement: Settlement) => void;
  consumeFeatureUsage: (featureName: FeatureName) => void;
  getDashboardSnapshot: () => DashboardSnapshot;
  getCategorySpend: (categoryId: string, month?: string) => number;
  getUpcomingBills: (horizonDays?: number) => UpcomingBill[];
  getGroupExpenses: (groupId: string) => GroupExpense[];
  getGroupBalances: (groupId: string) => ReturnType<typeof calculateGroupBalances>;
}

type PersistedAppState = Partial<AppState> & {
  hasCompletedOnboarding?: boolean;
};

const createEmptyProfile = (): Profile => {
  const now = new Date().toISOString();
  return {
    id: "",
    email: "",
    displayName: "",
    currency: DEFAULT_CURRENCY,
    biometricEnabled: false,
    createdAt: now,
    updatedAt: now,
    createdBy: ""
  };
};

const createDefaultEntitlement = (): EntitlementState => ({
  planId: "free",
  usage: {}
});

const createEmptyCollections = (profileId?: string, currency = DEFAULT_CURRENCY): DomainCollections => {
  const now = new Date().toISOString();
  return {
    wallets: profileId ? createSystemWallets(profileId, now, currency) : [],
    categories: profileId ? createSystemCategories(profileId, now) : [],
    transactions: [],
    budgets: [],
    monthlySpendingPlans: [],
    recurringBills: [],
    savingsGoals: [],
    savingsGoalContributions: [],
    receipts: [],
    aiInsights: [],
    groups: [],
    groupExpenses: [],
    settlements: [],
    activityLogs: []
  };
};

const createDemoCollections = (): DomainCollections => createEmptyCollections(DEMO_USER_ID);

const isCurrentMonthTransaction = (transaction: Transaction, today = new Date()): boolean => {
  const occurredAt = new Date(transaction.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return false;
  }

  return occurredAt >= new Date(startOfMonthISO(today)) && occurredAt <= new Date(endOfMonthISO(today));
};

const hasPersistedDemoCollections = (state: PersistedAppState): boolean =>
  Boolean(
    state.transactions?.some((item) => ["txn-salary", "txn-rent", "txn-swiggy"].includes(item.id)) ||
      state.recurringBills?.some((item) => ["bill-rent", "bill-netflix"].includes(item.id)) ||
      state.savingsGoals?.some((item) => ["goal-emergency-fund", "goal-trip"].includes(item.id)) ||
      state.groups?.some((item) => item.id === "group-goa")
  );

const displayNameFromEmail = (email: string): string => email.split("@")[0]?.replace(/[._-]+/g, " ") || "User";

const normalizeLocalDemoProfile = (profile: Profile): Profile => ({
  ...profile,
  displayName: displayNameFromEmail(profile.email),
  updatedAt: new Date().toISOString()
});

const ensureSystemCategories = (ownerId: string, categories: Category[]): Category[] => {
  if (categories.some((category) => category.kind === "income") && categories.some((category) => category.kind === "expense")) {
    return categories;
  }

  const now = new Date().toISOString();
  const existingIds = new Set(categories.map((category) => category.id));
  return [...categories, ...createSystemCategories(ownerId, now).filter((category) => !existingIds.has(category.id))];
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: createEmptyProfile(),
      ...createEmptyCollections(),
      entitlement: createDefaultEntitlement(),
      hasSeenOnboarding: false,
      isAuthenticated: false,
      authMode: null,
      themeMode: "system",
      appLanguage: DEFAULT_APP_LANGUAGE,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      completeAuthenticatedSession: (profile, authMode) =>
        set((state) => {
          const sameSession = authMode !== "local" && state.isAuthenticated && state.profile.id === profile.id && state.authMode === authMode;
          const collections = sameSession ? {} : authMode === "local" ? createDemoCollections() : createEmptyCollections(profile.id, profile.currency);

          return {
            ...collections,
            profile,
            authMode,
            hasSeenOnboarding: true,
            isAuthenticated: true,
            entitlement: {
              ...state.entitlement,
              planId: getDefaultPlanForAuthMode(authMode),
              activeUntil: null
            }
          };
        }),
      selectFreePlan: () =>
        set((state) => ({
          entitlement: {
            ...state.entitlement,
            planId: "free",
            activeUntil: null
          }
        })),
      endSession: () =>
        set({
          profile: createEmptyProfile(),
          ...createEmptyCollections(),
          entitlement: createDefaultEntitlement(),
          authMode: null,
          isAuthenticated: false,
          hasSeenOnboarding: true
        }),
      sanitizeLegacyDemoData: () =>
        set((state) => {
          const isDemoProfile = state.profile.id === DEMO_USER_ID;
          const expectedDemoName = displayNameFromEmail(state.profile.email);
          const needsDemoProfileNormalize = state.authMode === "local" && isDemoProfile && state.profile.displayName !== expectedDemoName;
          const hasProfile = state.isAuthenticated && Boolean(state.profile.id);
          const hasMissingBaseCollections =
            hasProfile &&
            (state.wallets.length === 0 ||
              !state.categories.some((category) => category.kind === "income") ||
              !state.categories.some((category) => category.kind === "expense"));
          const shouldResetDomain = hasPersistedDemoCollections(state) || needsDemoProfileNormalize;

          if (!shouldResetDomain && !hasMissingBaseCollections) {
            return {};
          }

          if (!shouldResetDomain) {
            const now = new Date().toISOString();
            return {
              wallets: state.wallets.length ? state.wallets : createSystemWallets(state.profile.id, now, state.profile.currency),
              categories: ensureSystemCategories(state.profile.id, state.categories)
            };
          }

          const nextCollections = createEmptyCollections(state.isAuthenticated && state.profile.id ? state.profile.id : undefined, state.profile.currency);
          return {
            ...nextCollections,
            profile: needsDemoProfileNormalize ? normalizeLocalDemoProfile(state.profile) : state.profile
          };
        }),
      setProfile: (profile) => set({ profile }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setAppLanguage: (appLanguage) => set({ appLanguage }),
      setCurrency: (currency) =>
        set((state) => {
          if (!state.profile.id || state.profile.currency === currency) {
            return {};
          }

          const now = new Date().toISOString();
          const profile = {
            ...state.profile,
            currency,
            updatedAt: now,
            updatedBy: state.profile.id
          };

          return {
            profile,
            wallets: state.wallets.map((wallet) => ({ ...wallet, currency, updatedAt: now, updatedBy: state.profile.id })),
            transactions: state.transactions.map((transaction) => ({ ...transaction, currency, updatedAt: now, updatedBy: state.profile.id })),
            budgets: state.budgets.map((budget) => ({ ...budget, currency, updatedAt: now, updatedBy: state.profile.id })),
            monthlySpendingPlans: state.monthlySpendingPlans.map((plan) => ({ ...plan, currency, updatedAt: now, updatedBy: state.profile.id })),
            recurringBills: state.recurringBills.map((bill) => ({ ...bill, currency, updatedAt: now, updatedBy: state.profile.id })),
            savingsGoals: state.savingsGoals.map((goal) => ({ ...goal, currency, updatedAt: now, updatedBy: state.profile.id })),
            savingsGoalContributions: state.savingsGoalContributions.map((contribution) => ({
              ...contribution,
              currency,
              updatedAt: now,
              updatedBy: state.profile.id
            })),
            receipts: state.receipts.map((receipt) => ({ ...receipt, currency, updatedAt: now, updatedBy: state.profile.id })),
            groups: state.groups.map((group) => ({ ...group, currency, updatedAt: now, updatedBy: state.profile.id })),
            groupExpenses: state.groupExpenses.map((expense) => ({ ...expense, currency, updatedAt: now, updatedBy: state.profile.id })),
            settlements: state.settlements.map((settlement) => ({ ...settlement, currency, updatedAt: now, updatedBy: state.profile.id }))
          };
        }),
      addTransaction: (transaction) =>
        set((state) => {
          const now = new Date().toISOString();
          return {
            wallets: applyTransactionWalletEffect({
              wallets: state.wallets,
              transaction,
              direction: 1,
              now,
              actorId: transaction.ownerId
            }),
            transactions: [transaction, ...state.transactions],
            activityLogs: [
              {
                id: `log-${Date.now()}`,
                actorId: transaction.ownerId,
                entityType: "transaction",
                entityId: transaction.id,
                action: "created",
                after: { ...transaction },
                createdAt: now,
                updatedAt: now,
                createdBy: transaction.ownerId
              },
              ...state.activityLogs
            ]
          };
        }),
      updateTransaction: (transaction) =>
        set((state) => {
          const previousTransaction = state.transactions.find((item) => item.id === transaction.id && !item.deletedAt);
          if (!previousTransaction) {
            return {};
          }

          const now = new Date().toISOString();
          const nextTransaction: Transaction = {
            ...transaction,
            ownerId: previousTransaction.ownerId,
            createdAt: previousTransaction.createdAt,
            createdBy: previousTransaction.createdBy,
            updatedAt: now,
            updatedBy: state.profile.id
          };

          return {
            wallets: applyTransactionReplacement({
              wallets: state.wallets,
              previousTransaction,
              nextTransaction,
              now,
              actorId: state.profile.id
            }),
            transactions: state.transactions.map((item) => (item.id === previousTransaction.id ? nextTransaction : item)),
            activityLogs: [
              {
                id: `log-${Date.now()}`,
                actorId: state.profile.id,
                entityType: "transaction",
                entityId: previousTransaction.id,
                action: "updated",
                before: { ...previousTransaction },
                after: { ...nextTransaction },
                createdAt: now,
                updatedAt: now,
                createdBy: state.profile.id
              },
              ...state.activityLogs
            ]
          };
        }),
      deleteTransaction: (transactionId) =>
        set((state) => {
          const transaction = state.transactions.find((item) => item.id === transactionId && !item.deletedAt);
          if (!transaction) {
            return {};
          }

          const now = new Date().toISOString();
          const deletedTransaction: Transaction = {
            ...transaction,
            deletedAt: now,
            updatedAt: now,
            updatedBy: state.profile.id
          };

          return {
            wallets: applyTransactionWalletEffect({
              wallets: state.wallets,
              transaction,
              direction: -1,
              now,
              actorId: state.profile.id
            }),
            transactions: state.transactions.map((item) => (item.id === transactionId ? deletedTransaction : item)),
            activityLogs: [
              {
                id: `log-${Date.now()}`,
                actorId: state.profile.id,
                entityType: "transaction",
                entityId: transactionId,
                action: "deleted",
                before: { ...transaction },
                after: { ...deletedTransaction },
                createdAt: now,
                updatedAt: now,
                createdBy: state.profile.id
              },
              ...state.activityLogs
            ]
          };
        }),
      addBudget: (budget) => set((state) => ({ budgets: [budget, ...state.budgets] })),
      setMonthlySpendingPlan: (allocatedSpendMinor, month = monthKey()) =>
        set((state) => {
          if (!Number.isSafeInteger(allocatedSpendMinor) || allocatedSpendMinor <= 0 || !state.profile.id) {
            return {};
          }

          const now = new Date().toISOString();
          const existingPlan = state.monthlySpendingPlans.find((plan) => plan.ownerId === state.profile.id && plan.month === month);
          const plan: MonthlySpendingPlan = {
            id: existingPlan?.id ?? `monthly-plan-${month}-${Date.now()}`,
            ownerId: state.profile.id,
            month,
            allocatedSpendMinor,
            currency: state.profile.currency,
            createdAt: existingPlan?.createdAt ?? now,
            updatedAt: now,
            createdBy: existingPlan?.createdBy ?? state.profile.id,
            updatedBy: state.profile.id
          };

          return {
            monthlySpendingPlans: [plan, ...state.monthlySpendingPlans.filter((item) => !(item.ownerId === state.profile.id && item.month === month))]
          };
        }),
      addRecurringBill: (bill) => set((state) => ({ recurringBills: [bill, ...state.recurringBills] })),
      markRecurringBillPaid: (billId) =>
        set((state) => ({
          recurringBills: state.recurringBills.map((bill) => (bill.id === billId ? markRecurringBillPaid(bill) : bill))
        })),
      updateRecurringBillStatus: (billId, status) =>
        set((state) => ({
          recurringBills: state.recurringBills.map((bill) => (bill.id === billId ? updateRecurringBillStatus(bill, status) : bill))
        })),
      addSavingsGoal: (goal) =>
        set((state) => ({
          savingsGoals: [goal, ...state.savingsGoals],
          activityLogs: [
            {
              id: `log-${Date.now()}`,
              actorId: goal.ownerId,
              entityType: "savings_goal",
              entityId: goal.id,
              action: "created",
              after: { ...goal },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: goal.ownerId
            },
            ...state.activityLogs
          ]
        })),
      addSavingsGoalContribution: (goalId, amountMinor) =>
        set((state) => {
          const goal = state.savingsGoals.find((item) => item.id === goalId);
          if (!goal || goal.status !== "active") {
            return {};
          }

          const contributionAmountMinor = amountMinor ?? Math.min(goal.monthlyContributionMinor, Math.max(0, goal.targetAmountMinor - goal.savedAmountMinor));
          if (contributionAmountMinor <= 0) {
            return {};
          }

          const contribution = createSavingsGoalContribution({
            ownerId: state.profile.id,
            goalId,
            amountMinor: contributionAmountMinor,
            currency: goal.currency
          });
          const updatedGoal = applySavingsGoalContribution(goal, contribution);

          return {
            savingsGoalContributions: [contribution, ...state.savingsGoalContributions],
            savingsGoals: state.savingsGoals.map((item) => (item.id === goalId ? updatedGoal : item)),
            activityLogs: [
              {
                id: `log-${Date.now()}`,
                actorId: state.profile.id,
                entityType: "savings_goal_contribution",
                entityId: contribution.id,
                action: "created",
                before: { ...goal },
                after: { goal: updatedGoal, contribution },
                createdAt: contribution.createdAt,
                updatedAt: contribution.updatedAt,
                createdBy: state.profile.id
              },
              ...state.activityLogs
            ]
          };
        }),
      updateSavingsGoalStatus: (goalId, status) =>
        set((state) => {
          const goal = state.savingsGoals.find((item) => item.id === goalId);
          if (!goal || goal.status === status) {
            return {};
          }

          const updatedGoal = updateSavingsGoalStatus(goal, status);
          return {
            savingsGoals: state.savingsGoals.map((item) => (item.id === goalId ? updatedGoal : item)),
            activityLogs: [
              {
                id: `log-${Date.now()}`,
                actorId: state.profile.id,
                entityType: "savings_goal",
                entityId: goal.id,
                action: "status_updated",
                before: { status: goal.status },
                after: { status: updatedGoal.status },
                createdAt: updatedGoal.updatedAt,
                updatedAt: updatedGoal.updatedAt,
                createdBy: state.profile.id
              },
              ...state.activityLogs
            ]
          };
        }),
      addReceipt: (receipt) => set((state) => ({ receipts: [receipt, ...state.receipts] })),
      addGroup: (group) =>
        set((state) => ({
          groups: [group, ...state.groups],
          entitlement: consumeUsage(state.entitlement, "split_group")
        })),
      addGroupExpense: (expense) =>
        set((state) => ({
          groupExpenses: [expense, ...state.groupExpenses],
          entitlement: consumeUsage(state.entitlement, "group_expense"),
          activityLogs: [
            {
              id: `log-${Date.now()}`,
              actorId: expense.createdBy,
              groupId: expense.groupId,
              entityType: "group_expense",
              entityId: expense.id,
              action: "created",
              after: { ...expense },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: expense.createdBy
            },
            ...state.activityLogs
          ]
        })),
      addSettlement: (settlement) => set((state) => ({ settlements: [settlement, ...state.settlements] })),
      consumeFeatureUsage: (featureName) =>
        set((state) => ({
          entitlement: consumeUsage(state.entitlement, featureName)
        })),
      getDashboardSnapshot: () => {
        const state = get();
        const currentMonth = monthKey();
        const incomeMinor = state.transactions
          .filter((transaction) => transaction.type === "income" && !transaction.deletedAt && isCurrentMonthTransaction(transaction))
          .reduce((total, transaction) => total + transaction.amountMinor, 0);
        const expenseMinor = state.transactions
          .filter((transaction) => transaction.type === "expense" && !transaction.deletedAt && isCurrentMonthTransaction(transaction))
          .reduce((total, transaction) => total + transaction.amountMinor, 0);
        const budgetMinor = state.budgets.filter((budget) => budget.month === currentMonth).reduce((total, budget) => total + budget.amountMinor, 0);
        const expectedBillsMinor = getExpectedBillsMinorForMonth(state.recurringBills);
        const savingsReserveMinor = getMonthlySavingsReserveMinor(state.savingsGoals);
        const monthlyPlan = state.monthlySpendingPlans.find((plan) => plan.ownerId === state.profile.id && plan.month === currentMonth);
        const spendPlan = calculateMonthlySpendPlan({
          incomeMinor,
          expenseMinor,
          expectedBillsMinor,
          allocatedSpendMinor: monthlyPlan?.allocatedSpendMinor
        });
        const availableMinor = spendPlan.spendRemainingMinor;
        return {
          incomeMinor,
          expenseMinor,
          availableMinor,
          ...spendPlan,
          safeDailySpendMinor: calculateSafeDailySpend({
            availableMinor,
            expectedBillsMinor: savingsReserveMinor
          }),
          expectedBillsMinor,
          savingsReserveMinor,
          pulseStatus: calculateMoneyPulse({
            incomeMinor,
            expenseMinor: spendPlan.committedSpendMinor,
            budgetMinor: spendPlan.allocatedSpendMinor || budgetMinor,
            recurringBillsMinor: expectedBillsMinor,
            savingsTargetMinor: savingsReserveMinor
          })
        };
      },
      getCategorySpend: (categoryId, month) => sumCategorySpend(get().transactions, categoryId, month),
      getUpcomingBills: (horizonDays = 30) => getUpcomingBills(get().recurringBills, { horizonDays }),
      getGroupExpenses: (groupId) => get().groupExpenses.filter((expense) => expense.groupId === groupId && !expense.deletedAt),
      getGroupBalances: (groupId) => {
        const group = get().groups.find((item) => item.id === groupId);
        if (!group) {
          return [];
        }
        return calculateGroupBalances(get().getGroupExpenses(groupId), group.members);
      }
    }),
    {
      name: "pocketsplit-store-v1",
      version: 10,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState) => {
        const { hasCompletedOnboarding, ...state } = (persistedState ?? {}) as PersistedAppState;
        const isAuthenticated = state.isAuthenticated ?? false;
        const authMode = isAuthenticated ? (state.authMode ?? "local") : null;
        const persistedProfile = isAuthenticated ? (state.profile ?? createEmptyProfile()) : createEmptyProfile();
        const isDemoProfile = persistedProfile.id === DEMO_USER_ID;
        const hasLegacyDemoDomain = hasPersistedDemoCollections(state);
        const nextIsAuthenticated = isAuthenticated && !(isDemoProfile && authMode !== "local");
        const nextAuthMode = nextIsAuthenticated ? authMode : null;
        const profile = isDemoProfile && authMode === "local" ? normalizeLocalDemoProfile(persistedProfile) : nextIsAuthenticated ? persistedProfile : createEmptyProfile();
        const shouldResetDomain = !nextIsAuthenticated || isDemoProfile || hasLegacyDemoDomain;
        const migrationNow = new Date().toISOString();
        const domain = shouldResetDomain
          ? createEmptyCollections(nextIsAuthenticated && profile.id ? profile.id : undefined, profile.currency)
          : ({
              wallets:
                state.wallets?.length || !profile.id
                  ? (state.wallets ?? [])
                  : createSystemWallets(profile.id, migrationNow, profile.currency),
              categories:
                state.categories?.length || !profile.id
                  ? profile.id
                    ? ensureSystemCategories(profile.id, state.categories ?? [])
                    : (state.categories ?? [])
                  : createSystemCategories(profile.id, migrationNow),
              transactions: state.transactions ?? [],
              budgets: state.budgets ?? [],
              monthlySpendingPlans: state.monthlySpendingPlans ?? [],
              recurringBills: state.recurringBills ?? [],
              savingsGoals: state.savingsGoals ?? [],
              savingsGoalContributions: state.savingsGoalContributions ?? [],
              receipts: state.receipts ?? [],
              aiInsights: state.aiInsights ?? [],
              groups: state.groups ?? [],
              groupExpenses: state.groupExpenses ?? [],
              settlements: state.settlements ?? [],
              activityLogs: state.activityLogs ?? []
            } satisfies DomainCollections);

        const reconciledDomain =
          nextIsAuthenticated && profile.id
            ? {
                ...domain,
                wallets: recalculateWalletBalances({
                  wallets: domain.wallets,
                  transactions: domain.transactions,
                  now: migrationNow,
                  actorId: profile.id
                })
              }
            : domain;

        return {
          ...state,
          ...reconciledDomain,
          profile,
          entitlement: state.entitlement ?? createDefaultEntitlement(),
          hasSeenOnboarding: state.hasSeenOnboarding ?? Boolean(hasCompletedOnboarding),
          isAuthenticated: nextIsAuthenticated,
          authMode: nextAuthMode,
          themeMode: state.themeMode === "light" || state.themeMode === "dark" || state.themeMode === "system" ? state.themeMode : "system",
          appLanguage: isSupportedAppLanguageCode(state.appLanguage) ? state.appLanguage : DEFAULT_APP_LANGUAGE
        } as AppState;
      },
      partialize: (state) => ({
        profile: state.profile,
        wallets: state.wallets,
        categories: state.categories,
        transactions: state.transactions,
        budgets: state.budgets,
        monthlySpendingPlans: state.monthlySpendingPlans,
        recurringBills: state.recurringBills,
        savingsGoals: state.savingsGoals,
        savingsGoalContributions: state.savingsGoalContributions,
        receipts: state.receipts,
        aiInsights: state.aiInsights,
        groups: state.groups,
        groupExpenses: state.groupExpenses,
        settlements: state.settlements,
        entitlement: state.entitlement,
        hasSeenOnboarding: state.hasSeenOnboarding,
        isAuthenticated: state.isAuthenticated,
        authMode: state.authMode,
        themeMode: state.themeMode,
        appLanguage: state.appLanguage,
        activityLogs: state.activityLogs
      })
    }
  )
);

export const selectBudgetUsage = (state: AppState) =>
  state.budgets.map((budget) => ({
    budget,
    usage: calculateBudgetUsage(state.getCategorySpend(budget.categoryId, budget.month), budget.amountMinor)
  }));
