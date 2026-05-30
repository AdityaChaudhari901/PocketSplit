import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getExpensesByDate, getExpensesByMonth } from "@/features/calendar/calendarService";
import { useAppStore } from "@/store/app.store";

export const calendarMonthQueryKey = (userId: string, year: number, month: number, signature: string) =>
  ["calendar-month", userId, year, month, signature] as const;

export const calendarDayQueryKey = (userId: string, date: string, signature: string) => ["calendar-day", userId, date, signature] as const;

const useTransactionSignature = (): string => {
  const transactions = useAppStore((state) => state.transactions);
  return useMemo(() => transactions.map((transaction) => `${transaction.id}:${transaction.updatedAt}:${transaction.deletedAt ?? ""}`).join("|"), [transactions]);
};

export const useMonthExpenses = (year: number, month: number) => {
  const userId = useAppStore((state) => state.profile.id);
  const authMode = useAppStore((state) => state.authMode);
  const transactions = useAppStore((state) => state.transactions);
  const signature = useTransactionSignature();

  return useQuery({
    queryKey: calendarMonthQueryKey(userId, year, month, authMode === "supabase" ? "server" : signature),
    queryFn: async () => getExpensesByMonth(userId, year, month, authMode === "supabase" ? undefined : transactions),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000
  });
};

export const useDayExpenses = (date?: string) => {
  const userId = useAppStore((state) => state.profile.id);
  const authMode = useAppStore((state) => state.authMode);
  const transactions = useAppStore((state) => state.transactions);
  const signature = useTransactionSignature();

  return useQuery({
    queryKey: calendarDayQueryKey(userId, date ?? "", authMode === "supabase" ? "server" : signature),
    queryFn: async () => getExpensesByDate(userId, date!, authMode === "supabase" ? undefined : transactions),
    enabled: Boolean(userId && date)
  });
};
