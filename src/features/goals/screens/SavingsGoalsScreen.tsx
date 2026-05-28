import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import { calculateSavingsGoalProgress, getMonthlySavingsReserveMinor } from "@/services/savings-goal.service";
import { useAppStore } from "@/store/app.store";
import type { SavingsGoal } from "@/types/domain";

const formatTargetDate = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(isoDate));

const goalTone = (goal: SavingsGoal): "success" | "warning" | "danger" | "neutral" | "ai" => {
  if (goal.status === "completed") {
    return "success";
  }

  if (goal.status === "paused" || goal.status === "archived") {
    return "neutral";
  }

  return new Date(goal.targetDate) < new Date() ? "warning" : "ai";
};

export const SavingsGoalsScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();
  const addContribution = useAppStore((store) => store.addSavingsGoalContribution);
  const updateStatus = useAppStore((store) => store.updateSavingsGoalStatus);
  const monthlyReserveMinor = getMonthlySavingsReserveMinor(state.savingsGoals);
  const activeGoals = state.savingsGoals.filter((goal) => goal.status === "active");

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">Savings goals</AppText>
          <AppText muted>Reserve planned contributions before PocketSplit calculates daily spend.</AppText>
        </View>
        <Button icon="add-circle" onPress={() => router.push("/modals/savings-goal-form")}>
          Add
        </Button>
      </View>

      <Card style={styles.summary}>
        <View style={[styles.summaryIcon, { backgroundColor: theme.colors.successSoft }]}>
          <Ionicons name="flag" size={22} color={theme.colors.success} />
        </View>
        <View style={styles.headerCopy}>
          <AppText variant="caption" muted>
            Monthly savings reserve
          </AppText>
          <MoneyAmount amountMinor={monthlyReserveMinor} currency={state.profile.currency} size="title" />
          <AppText muted>{activeGoals.length} active goals reduce spendable cash this month.</AppText>
        </View>
      </Card>

      {state.savingsGoals.length === 0 ? (
        <EmptyState
          icon="flag"
          title="No savings goals yet"
          body="Add a target and monthly contribution so safe daily spend accounts for your future plans."
          actionLabel="Add savings goal"
          onAction={() => router.push("/modals/savings-goal-form")}
        />
      ) : (
        state.savingsGoals.map((goal) => {
          const progress = calculateSavingsGoalProgress(goal);
          return (
            <Card key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={styles.headerCopy}>
                  <AppText variant="subtitle">{goal.name}</AppText>
                  <AppText muted>
                    Target {formatTargetDate(goal.targetDate)} - {progress.monthsRemaining} months left
                  </AppText>
                </View>
                <StatusBadge label={goal.status} tone={goalTone(goal)} />
              </View>

              <View style={styles.amountRow}>
                <View>
                  <AppText variant="caption" muted>
                    Saved
                  </AppText>
                  <MoneyAmount amountMinor={goal.savedAmountMinor} currency={goal.currency} size="subtitle" />
                </View>
                <View>
                  <AppText variant="caption" muted>
                    Target
                  </AppText>
                  <MoneyAmount amountMinor={goal.targetAmountMinor} currency={goal.currency} size="subtitle" />
                </View>
              </View>

              <ProgressBar progress={progress.percentage} tone={goal.status === "completed" ? "success" : "primary"} />
              <AppText muted>
                Reserve {formatMoney(goal.monthlyContributionMinor, goal.currency)} monthly. Suggested:{" "}
                {formatMoney(progress.suggestedMonthlyContributionMinor, goal.currency)}.
              </AppText>

              <View style={styles.actions}>
                {goal.status === "active" ? (
                  <>
                    <Button variant="secondary" icon="add-circle" onPress={() => addContribution(goal.id)}>
                      Add planned contribution
                    </Button>
                    <Button variant="ghost" icon="pause-circle" onPress={() => updateStatus(goal.id, "paused")}>
                      Pause
                    </Button>
                  </>
                ) : goal.status === "paused" ? (
                  <Button variant="secondary" icon="play-circle" onPress={() => updateStatus(goal.id, "active")}>
                    Resume
                  </Button>
                ) : null}
                {goal.status !== "archived" ? (
                  <Button
                    variant="ghost"
                    icon="archive"
                    onPress={() =>
                      Alert.alert("Archive goal?", `${goal.name} will stop affecting safe daily spend.`, [
                        { text: "Keep", style: "cancel" },
                        { text: "Archive", onPress: () => updateStatus(goal.id, "archived") }
                      ])
                    }
                  >
                    Archive
                  </Button>
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1
  },
  summary: {
    flexDirection: "row",
    gap: spacing.md
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  goalCard: {
    gap: spacing.md
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  actions: {
    gap: spacing.sm
  }
});
