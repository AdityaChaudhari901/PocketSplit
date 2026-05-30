import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getBudgetVsActual,
  getCategoryBreakdown,
  getMonthlySummary,
  getMonthlyTrend,
  getSavingsProgress,
  getTopMerchants,
  type ReportsContext
} from "@/features/reports/reportsService";
import { useAppStore } from "@/store/app.store";

const useReportsContext = (): { userId: string; authMode: ReturnType<typeof useAppStore.getState>["authMode"]; context: ReportsContext; signature: string } => {
  const userId = useAppStore((state) => state.profile.id);
  const authMode = useAppStore((state) => state.authMode);
  const transactions = useAppStore((state) => state.transactions);
  const categories = useAppStore((state) => state.categories);
  const budgets = useAppStore((state) => state.budgets);
  const savingsGoals = useAppStore((state) => state.savingsGoals);
  const signature = useMemo(() => {
    const transactionSignature = transactions.map((transaction) => `${transaction.id}:${transaction.updatedAt}:${transaction.deletedAt ?? ""}`).join("|");
    const categorySignature = categories.map((category) => `${category.id}:${category.updatedAt}:${category.deletedAt ?? ""}`).join("|");
    const budgetSignature = budgets.map((budget) => `${budget.id}:${budget.updatedAt}:${budget.deletedAt ?? ""}`).join("|");
    const goalSignature = savingsGoals.map((goal) => `${goal.id}:${goal.updatedAt}:${goal.deletedAt ?? ""}`).join("|");
    return `${authMode ?? "none"}:${userId}:${transactionSignature}:${categorySignature}:${budgetSignature}:${goalSignature}`;
  }, [authMode, budgets, categories, savingsGoals, transactions, userId]);

  return {
    userId,
    authMode,
    signature,
    context: {
      transactions,
      categories,
      budgets,
      savingsGoals
    }
  };
};

const resolveContext = (authMode: ReturnType<typeof useAppStore.getState>["authMode"], context: ReportsContext): ReportsContext | undefined =>
  authMode === "supabase" ? undefined : context;

export const useMonthlySummary = (year: number, month: number) => {
  const { userId, authMode, context, signature } = useReportsContext();
  return useQuery({
    queryKey: ["reports", "summary", userId, year, month, authMode === "supabase" ? "server" : signature],
    queryFn: async () => getMonthlySummary(userId, year, month, resolveContext(authMode, context)),
    enabled: Boolean(userId),
    staleTime: 60_000
  });
};

export const useMonthlyTrend = (months: number, referenceYear?: number, referenceMonth?: number) => {
  const { userId, authMode, context, signature } = useReportsContext();
  const referenceDate =
    referenceYear && referenceMonth ? new Date(Date.UTC(referenceYear, referenceMonth - 1, 1)) : undefined;
  const queryContext = referenceDate ? { ...context, referenceDate } : context;
  const serverContext = referenceDate ? { referenceDate } : undefined;
  return useQuery({
    queryKey: ["reports", "trend", userId, months, referenceYear, referenceMonth, authMode === "supabase" ? "server" : signature],
    queryFn: async () => getMonthlyTrend(userId, months, authMode === "supabase" ? serverContext : queryContext),
    enabled: Boolean(userId),
    staleTime: 60_000
  });
};

export const useCategoryBreakdown = (year: number, month: number) => {
  const { userId, authMode, context, signature } = useReportsContext();
  return useQuery({
    queryKey: ["reports", "categories", userId, year, month, authMode === "supabase" ? "server" : signature],
    queryFn: async () => getCategoryBreakdown(userId, year, month, resolveContext(authMode, context)),
    enabled: Boolean(userId),
    staleTime: 60_000
  });
};

export const useTopMerchants = (year: number, month: number, limit = 5) => {
  const { userId, authMode, context, signature } = useReportsContext();
  return useQuery({
    queryKey: ["reports", "merchants", userId, year, month, limit, authMode === "supabase" ? "server" : signature],
    queryFn: async () => getTopMerchants(userId, year, month, limit, resolveContext(authMode, context)),
    enabled: Boolean(userId),
    staleTime: 60_000
  });
};

export const useBudgetVsActual = (year: number, month: number) => {
  const { userId, authMode, context, signature } = useReportsContext();
  return useQuery({
    queryKey: ["reports", "budget-vs-actual", userId, year, month, authMode === "supabase" ? "server" : signature],
    queryFn: async () => getBudgetVsActual(userId, year, month, resolveContext(authMode, context)),
    enabled: Boolean(userId),
    staleTime: 60_000
  });
};

export const useSavingsProgress = () => {
  const { userId, authMode, context, signature } = useReportsContext();
  return useQuery({
    queryKey: ["reports", "savings-progress", userId, authMode === "supabase" ? "server" : signature],
    queryFn: async () => getSavingsProgress(userId, resolveContext(authMode, context)),
    enabled: Boolean(userId),
    staleTime: 60_000
  });
};
