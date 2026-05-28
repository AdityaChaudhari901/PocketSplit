import { useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { ChartCard } from "@/components/cards/ChartCard";
import { PaywallCard } from "@/components/cards/PaywallCard";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { monthKey } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { spacing } from "@/lib/theme";
import { canUseFeature } from "@/services/entitlement.service";
import { buildTransactionsCsv, queuePdfExport } from "@/services/export.service";
import { getExpectedBillsMinorForMonth } from "@/services/recurring-bill.service";
import { getMonthlySavingsReserveMinor } from "@/services/savings-goal.service";
import { useAppStore } from "@/store/app.store";

export const ReportsScreen = () => {
  const state = useAppStore();
  const snapshot = state.getDashboardSnapshot();
  const canExportPdf = canUseFeature(state.entitlement, "pdf_export");
  const expectedBillsMinor = getExpectedBillsMinorForMonth(state.recurringBills);
  const savingsReserveMinor = getMonthlySavingsReserveMinor(state.savingsGoals);
  const activeRecurringBills = state.recurringBills.filter((bill) => bill.status === "active");
  const activeSavingsGoals = state.savingsGoals.filter((goal) => goal.status === "active");
  const currentMonth = monthKey();

  const categoryRows = useMemo(() => {
    const totalExpense = Math.max(snapshot.expenseMinor, 1);
    return state.categories
      .filter((category) => category.kind === "expense")
      .map((category) => ({
        label: category.name,
        value: Math.round((state.getCategorySpend(category.id, currentMonth) / totalExpense) * 100)
      }))
      .filter((row) => row.value > 0)
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }, [currentMonth, snapshot.expenseMinor, state]);

  return (
    <Screen>
      <View>
        <AppText variant="hero">Reports</AppText>
        <AppText muted>Monthly overview, budget progress, subscriptions, savings goals, and split reports.</AppText>
      </View>

      <Card style={styles.summary}>
        <View>
          <AppText variant="caption" muted>
            Income
          </AppText>
          <MoneyAmount amountMinor={snapshot.incomeMinor} currency={state.profile.currency} />
        </View>
        <View>
          <AppText variant="caption" muted>
            Expenses
          </AppText>
          <MoneyAmount amountMinor={snapshot.expenseMinor} currency={state.profile.currency} />
        </View>
      </Card>

      <ChartCard title="Category breakdown" rows={categoryRows.length ? categoryRows : [{ label: "No expense data", value: 0 }]} />
      <ChartCard
        title="Budget progress"
        rows={[
          { label: "Used", value: Math.min(100, Math.round((snapshot.expenseMinor / Math.max(snapshot.incomeMinor, 1)) * 100)), colorTone: "warning" },
          { label: "Available", value: Math.max(0, Math.round((snapshot.availableMinor / Math.max(snapshot.incomeMinor, 1)) * 100)), colorTone: "success" }
        ]}
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

      {canExportPdf ? (
        <View style={styles.actions}>
          <Button
            icon="document-text"
            onPress={() => {
              const csv = buildTransactionsCsv(state.transactions);
              Alert.alert("CSV generated", `${csv.split("\n").length - 1} transactions are ready for export wiring.`);
            }}
          >
            Export CSV
          </Button>
          <Button
            icon="document"
            variant="secondary"
            onPress={async () => {
              const result = await queuePdfExport();
              Alert.alert("PDF export", result.message);
            }}
          >
            Export PDF
          </Button>
        </View>
      ) : (
        <PaywallCard title="Advanced exports are Pro" body="PDF exports, deep reports, and anomaly detection are gated through central entitlements." />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  summary: {
    gap: spacing.md
  },
  actions: {
    gap: spacing.md
  }
});
