import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ExportSheet } from "@/components/export/ExportSheet";
import { BudgetVsActualCard } from "@/components/reports/BudgetVsActualCard";
import { CategoryBreakdownChart } from "@/components/reports/CategoryBreakdownChart";
import { MonthlyTrendChart } from "@/components/reports/MonthlyTrendChart";
import { PeriodSelector } from "@/components/reports/PeriodSelector";
import { SummaryCards } from "@/components/reports/SummaryCards";
import { TopMerchantsCard } from "@/components/reports/TopMerchantsCard";
import { PaywallCard } from "@/components/cards/PaywallCard";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { useBudgetVsActual, useCategoryBreakdown, useMonthlySummary, useMonthlyTrend, useTopMerchants } from "@/features/reports/hooks";
import { formatMoney } from "@/lib/money";
import { spacing } from "@/lib/theme";
import { canUseFeature } from "@/services/entitlement.service";
import { getExpectedBillsMinorForMonth } from "@/services/recurring-bill.service";
import { getMonthlySavingsReserveMinor } from "@/services/savings-goal.service";
import { useAppStore } from "@/store/app.store";

interface PeriodState {
  year: number;
  month: number;
}

const currentPeriod = (date = new Date()): PeriodState => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1
});

const shiftPeriod = ({ year, month }: PeriodState, offset: number): PeriodState => {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1
  };
};

const asError = (value: unknown): Error | null => (value instanceof Error ? value : value ? new Error("Unable to load this report.") : null);

const periodDateRange = ({ year, month }: PeriodState): { fromDate: string; toDate: string } => {
  const monthText = `${month}`.padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    fromDate: `${year}-${monthText}-01`,
    toDate: `${year}-${monthText}-${`${lastDay}`.padStart(2, "0")}`
  };
};

export const ReportsScreen = () => {
  const state = useAppStore();
  const canExportData = canUseFeature(state.entitlement, "data_export");
  const expectedBillsMinor = getExpectedBillsMinorForMonth(state.recurringBills);
  const savingsReserveMinor = getMonthlySavingsReserveMinor(state.savingsGoals);
  const activeRecurringBills = state.recurringBills.filter((bill) => bill.status === "active");
  const activeSavingsGoals = state.savingsGoals.filter((goal) => goal.status === "active");
  const [period, setPeriod] = useState<PeriodState>(() => currentPeriod());
  const [exportVisible, setExportVisible] = useState(false);
  const summaryQuery = useMonthlySummary(period.year, period.month);
  const trendQuery = useMonthlyTrend(6, period.year, period.month);
  const categoryQuery = useCategoryBreakdown(period.year, period.month);
  const merchantQuery = useTopMerchants(period.year, period.month, 5);
  const budgetQuery = useBudgetVsActual(period.year, period.month);
  const exportRange = periodDateRange(period);

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.heroCopy}>
        <AppText variant="hero">Reports</AppText>
        <AppText muted>Monthly analytics, category spend, top merchants, budgets, subscriptions, savings, and exports.</AppText>
      </View>

      <PeriodSelector year={period.year} month={period.month} onPrevious={() => setPeriod((current) => shiftPeriod(current, -1))} onNext={() => setPeriod((current) => shiftPeriod(current, 1))} />

      <SummaryCards
        summary={summaryQuery.data}
        currency={state.profile.currency}
        loading={summaryQuery.isLoading}
        error={asError(summaryQuery.error)}
        onRetry={() => void summaryQuery.refetch()}
      />

      <MonthlyTrendChart
        data={trendQuery.data}
        currency={state.profile.currency}
        loading={trendQuery.isLoading}
        error={asError(trendQuery.error)}
        onRetry={() => void trendQuery.refetch()}
      />

      <CategoryBreakdownChart
        rows={categoryQuery.data}
        currency={state.profile.currency}
        loading={categoryQuery.isLoading}
        error={asError(categoryQuery.error)}
        onRetry={() => void categoryQuery.refetch()}
      />

      <TopMerchantsCard
        rows={merchantQuery.data}
        currency={state.profile.currency}
        loading={merchantQuery.isLoading}
        error={asError(merchantQuery.error)}
        onRetry={() => void merchantQuery.refetch()}
      />

      <BudgetVsActualCard
        rows={budgetQuery.data}
        currency={state.profile.currency}
        loading={budgetQuery.isLoading}
        error={asError(budgetQuery.error)}
        onRetry={() => void budgetQuery.refetch()}
      />

      <Card style={styles.summary}>
        <View>
          <AppText variant="subtitle">Split expense report</AppText>
          <AppText muted>{state.groups.length} groups tracked with immutable activity logs.</AppText>
        </View>
      </Card>

      <Card style={styles.summary}>
        <View>
          <AppText variant="subtitle">Subscription report</AppText>
          <AppText muted>
            {activeRecurringBills.length} active recurring bills reserve {formatMoney(expectedBillsMinor, state.profile.currency)} before safe daily spend.
          </AppText>
        </View>
      </Card>

      <Card style={styles.summary}>
        <View>
          <AppText variant="subtitle">Savings goals report</AppText>
          <AppText muted>
            {activeSavingsGoals.length} active goals reserve {formatMoney(savingsReserveMinor, state.profile.currency)} before PocketSplit calculates daily spend.
          </AppText>
        </View>
      </Card>

      {canExportData ? (
        <View style={styles.actions}>
          <Button icon="share-outline" onPress={() => setExportVisible(true)}>
            Export report
          </Button>
        </View>
      ) : (
        <PaywallCard title="Exports are locked" body="CSV and PDF report exports are gated through central entitlements." />
      )}
      <ExportSheet
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
        initialParams={{
          scope: "personal",
          format: "pdf",
          fromDate: exportRange.fromDate,
          toDate: exportRange.toDate
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 140
  },
  heroCopy: {
    gap: spacing.xs
  },
  summary: {
    gap: spacing.md
  },
  actions: {
    gap: spacing.md
  }
});
