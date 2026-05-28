import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { spacing, useAppTheme } from "@/lib/theme";
import { calculateSavingsGoalProgress } from "@/services/savings-goal.service";
import type { CurrencyCode, SavingsGoal } from "@/types/domain";

interface SavingsGoalsCardProps {
  goals: SavingsGoal[];
  monthlyReserveMinor: number;
  currency: CurrencyCode;
  onContribute: (goalId: string) => void;
}

export const SavingsGoalsCard = ({ goals, monthlyReserveMinor, currency, onContribute }: SavingsGoalsCardProps) => {
  const router = useRouter();
  const theme = useAppTheme();
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const primaryGoal = activeGoals[0];
  const progress = primaryGoal ? calculateSavingsGoalProgress(primaryGoal) : null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: theme.colors.successSoft }]}>
            <Ionicons name="flag" size={18} color={theme.colors.success} />
          </View>
          <View style={styles.copy}>
            <AppText variant="subtitle">Savings goals</AppText>
            <AppText muted>Reserved from spendable cash before daily budget.</AppText>
          </View>
        </View>
        <MoneyAmount amountMinor={monthlyReserveMinor} currency={currency} size="subtitle" />
      </View>

      {progress ? (
        <View style={styles.goal}>
          <View style={styles.goalHeader}>
            <View style={styles.copy}>
              <AppText variant="body">{progress.goal.name}</AppText>
              <AppText muted>
                {progress.percentage}% saved - {progress.monthsRemaining} months left
              </AppText>
            </View>
            <MoneyAmount amountMinor={progress.remainingMinor} currency={progress.goal.currency} size="body" muted />
          </View>
          <ProgressBar progress={progress.percentage} tone={progress.percentage >= 80 ? "success" : "primary"} />
          <Button variant="ghost" icon="add-circle" onPress={() => onContribute(progress.goal.id)}>
            Add planned contribution
          </Button>
        </View>
      ) : (
        <AppText muted>No active savings goals yet.</AppText>
      )}

      <View style={styles.actions}>
        <Button variant="secondary" icon="add-circle" onPress={() => router.push("/modals/savings-goal-form")}>
          Add goal
        </Button>
        <Button variant="ghost" icon="list" onPress={() => router.push("/modals/savings-goals")}>
          Manage
        </Button>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1
  },
  goal: {
    gap: spacing.sm
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  }
});
