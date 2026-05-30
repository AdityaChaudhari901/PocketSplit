import { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { DayExpenseList } from "@/components/calendar/DayExpenseList";
import { DaySummaryCard } from "@/components/calendar/DaySummaryCard";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useDayExpenses, useMonthExpenses } from "@/features/calendar/hooks";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

interface MonthState {
  year: number;
  month: number;
}

const currentMonthState = (date = new Date()): MonthState => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1
});

const todayDateKey = (): string => new Date().toISOString().slice(0, 10);

const shiftMonth = ({ year, month }: MonthState, offset: number): MonthState => {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  };
};

const monthFirstDate = ({ year, month }: MonthState): string => `${year}-${`${month}`.padStart(2, "0")}-01`;

export const CalendarScreen = () => {
  const router = useRouter();
  const currency = useAppStore((state) => state.profile.currency);
  const categories = useAppStore((state) => state.categories);
  const [visibleMonth, setVisibleMonth] = useState<MonthState>(() => currentMonthState());
  const [selectedDate, setSelectedDate] = useState<string>(() => todayDateKey());
  const monthQuery = useMonthExpenses(visibleMonth.year, visibleMonth.month);
  const previousMonth = shiftMonth(visibleMonth, -1);
  const nextMonth = shiftMonth(visibleMonth, 1);
  useMonthExpenses(previousMonth.year, previousMonth.month);
  useMonthExpenses(nextMonth.year, nextMonth.month);
  const dayQuery = useDayExpenses(selectedDate);
  const summaries = useMemo(() => monthQuery.data ?? [], [monthQuery.data]);
  const selectedSummary = summaries.find((summary) => summary.date === selectedDate);

  const monthTotals = useMemo(
    () =>
      summaries.reduce(
        (totals, summary) => ({
          incomeMinor: totals.incomeMinor + summary.totalIncomeMinor,
          expenseMinor: totals.expenseMinor + summary.totalExpenseMinor,
          count: totals.count + summary.expenseCount
        }),
        { incomeMinor: 0, expenseMinor: 0, count: 0 }
      ),
    [summaries]
  );
  const monthNetMinor = monthTotals.incomeMinor - monthTotals.expenseMinor;

  const selectDate = (date: string) => {
    setSelectedDate(date);
  };

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const next = shiftMonth(current, offset);
      setSelectedDate(monthFirstDate(next));
      return next;
    });
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.heroCopy}>
        <AppText variant="hero">Calendar</AppText>
        <AppText muted>Track daily income and expenses across the month.</AppText>
      </View>

      <View style={styles.monthSummaryGrid}>
        <MonthStat label="Income" value={formatMoney(monthTotals.incomeMinor, currency)} tone="income" />
        <MonthStat label="Expense" value={formatMoney(monthTotals.expenseMinor, currency)} tone="expense" />
        <MonthStat label="Net" value={formatMoney(monthNetMinor, currency)} tone={monthNetMinor >= 0 ? "income" : "expense"} />
      </View>

      <MonthCalendar
        year={visibleMonth.year}
        month={visibleMonth.month}
        summaries={summaries}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onPreviousMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
      />

      {monthQuery.isFetching ? (
        <AppText variant="caption" muted>
          Updating month activity...
        </AppText>
      ) : null}

      <View style={styles.daySection}>
        <DaySummaryCard date={selectedDate} summary={selectedSummary} currency={currency} />
        <View style={styles.dayHeader}>
          <AppText variant="subtitle">Day activity</AppText>
          <AppText variant="caption" muted>
            {dayQuery.data?.length ?? 0} entries
          </AppText>
        </View>
        <DayExpenseList
          transactions={dayQuery.data ?? []}
          categories={categories}
          loading={dayQuery.isLoading || (dayQuery.isFetching && !dayQuery.data)}
          onPressTransaction={(transaction) =>
            router.push({
              pathname: "/modals/edit-transaction",
              params: { transactionId: transaction.id }
            })
          }
        />
      </View>
    </Screen>
  );
};

const MonthStat = ({ label, value, tone }: { label: string; value: string; tone: "income" | "expense" }) => {
  const theme = useAppTheme();
  const color = tone === "income" ? theme.colors.success : theme.colors.danger;
  return (
    <Card elevated={false} style={styles.monthStat}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="body" style={{ color }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </Card>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.sm,
    paddingBottom: 140
  },
  heroCopy: {
    gap: spacing.xs
  },
  monthSummaryGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  monthStat: {
    flex: 1,
    minHeight: 76,
    padding: spacing.md,
    justifyContent: "center",
    gap: spacing.xs
  },
  daySection: {
    gap: spacing.md
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
