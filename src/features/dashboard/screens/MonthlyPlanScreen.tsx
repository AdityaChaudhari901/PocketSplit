import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
import { formatMoney } from "@/lib/money";
import { spacing } from "@/lib/theme";
import { majorToMinor, minorToMajorInput } from "@/schemas/transaction.schema";
import { useAppStore } from "@/store/app.store";

export const MonthlyPlanScreen = () => {
  const router = useRouter();
  const state = useAppStore();
  const setMonthlySpendingPlan = useAppStore((store) => store.setMonthlySpendingPlan);
  const snapshot = state.getDashboardSnapshot();
  const initialAmount = useMemo(
    () => minorToMajorInput(snapshot.allocatedSpendMinor || snapshot.incomeMinor, state.profile.currency),
    [snapshot.allocatedSpendMinor, snapshot.incomeMinor, state.profile.currency]
  );
  const [amount, setAmount] = useState(initialAmount);

  const parsedAllocationMinor = majorToMinor(amount, state.profile.currency);
  const plannedSavingsMinor = Math.max(0, snapshot.incomeMinor - Math.max(0, parsedAllocationMinor));
  const spendLeftMinor = Math.max(0, parsedAllocationMinor - snapshot.committedSpendMinor);

  const save = () => {
    const allocatedSpendMinor = majorToMinor(amount, state.profile.currency);

    if (allocatedSpendMinor <= 0) {
      Alert.alert("Invalid allocation", "Enter the amount you want to allow for expenses this month.");
      return;
    }

    if (snapshot.incomeMinor > 0 && allocatedSpendMinor > snapshot.incomeMinor) {
      Alert.alert("Allocation is too high", "Your monthly spend allocation should not be higher than this month's recorded income.");
      return;
    }

    setMonthlySpendingPlan(allocatedSpendMinor);
    router.back();
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Monthly plan</AppText>
        <AppText muted>{"Set how much of this month's income is allowed for expenses. Expenses and upcoming dues subtract from this number."}</AppText>
      </View>

      <Card style={styles.card}>
        <View style={styles.summaryGrid}>
          <SummaryItem label="Monthly salary" value={formatMoney(snapshot.incomeMinor, state.profile.currency)} />
          <SummaryItem label="Current expenses + dues" value={formatMoney(snapshot.committedSpendMinor, state.profile.currency)} />
        </View>

        <TextField label="Allocated expense" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Enter monthly spend limit" />

        <View style={styles.preview}>
          <View style={styles.previewRow}>
            <AppText muted>Can spend after current activity</AppText>
            <AppText style={styles.previewAmount}>{formatMoney(spendLeftMinor, state.profile.currency)}</AppText>
          </View>
          <View style={styles.previewRow}>
            <AppText muted>Planned savings buffer</AppText>
            <StatusBadge label={formatMoney(plannedSavingsMinor, state.profile.currency)} tone={plannedSavingsMinor > 0 ? "success" : "neutral"} />
          </View>
        </View>

        <Button variant="secondary" icon="wallet" onPress={() => setAmount(minorToMajorInput(snapshot.incomeMinor, state.profile.currency))}>
          Spend all income
        </Button>
        <Button icon="checkmark-circle" onPress={save}>
          Save monthly plan
        </Button>
      </Card>
    </Screen>
  );
};

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryItem}>
    <AppText variant="caption" muted>
      {label}
    </AppText>
    <AppText style={styles.summaryValue}>{value}</AppText>
  </View>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  summaryGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  summaryItem: {
    flex: 1,
    gap: spacing.xs
  },
  summaryValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900"
  },
  preview: {
    gap: spacing.sm
  },
  previewRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  previewAmount: {
    color: "#059669",
    fontWeight: "900"
  }
});
