import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import { daysUntil, getExpectedBillsMinorForMonth } from "@/services/recurring-bill.service";
import { useAppStore } from "@/store/app.store";
import type { RecurringBill } from "@/types/domain";

const formatDueDate = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(isoDate));

const statusTone = (bill: RecurringBill): "success" | "warning" | "danger" | "neutral" => {
  if (bill.status === "cancelled") {
    return "danger";
  }

  if (bill.status === "paused") {
    return "neutral";
  }

  const remainingDays = daysUntil(bill.nextDueAt);
  if (remainingDays < 0) {
    return "danger";
  }

  return remainingDays <= bill.remindDaysBefore ? "warning" : "success";
};

const statusLabel = (bill: RecurringBill): string => {
  if (bill.status !== "active") {
    return bill.status;
  }

  const remainingDays = daysUntil(bill.nextDueAt);
  if (remainingDays < 0) {
    return `${Math.abs(remainingDays)}d overdue`;
  }

  if (remainingDays === 0) {
    return "due today";
  }

  return `${remainingDays}d left`;
};

export const RecurringBillsScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();
  const markPaid = useAppStore((store) => store.markRecurringBillPaid);
  const updateStatus = useAppStore((store) => store.updateRecurringBillStatus);
  const activeBills = state.recurringBills.filter((bill) => bill.status === "active");
  const expectedThisMonth = getExpectedBillsMinorForMonth(state.recurringBills);

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero" style={styles.title}>
            Recurring bills
          </AppText>
          <AppText muted style={styles.subtitle}>
            Protect safe daily spend from rent, EMIs, subscriptions, and fixed bills.
          </AppText>
        </View>
      </View>

      <Card style={styles.summary}>
        <View style={[styles.summaryIcon, { backgroundColor: theme.colors.warningSoft }]}>
          <Ionicons name="shield-checkmark" size={18} color={theme.colors.warning} />
        </View>
        <View style={styles.headerCopy}>
          <AppText variant="caption" muted>
            Reserved this month
          </AppText>
          <MoneyAmount amountMinor={expectedThisMonth} currency={state.profile.currency} size="subtitle" />
          <AppText muted style={styles.summaryCopy}>
            {activeBills.length} active bills are included in safe daily spend.
          </AppText>
        </View>
      </Card>

      {state.recurringBills.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No recurring bills yet"
          body="Add your rent, EMIs, and subscriptions to make MoneyPulse forecast your real spendable amount."
          actionLabel="Add recurring bill"
          onAction={() => router.push("/modals/recurring-bill-form")}
        />
      ) : (
        <>
          {state.recurringBills.map((bill) => (
            <Card key={bill.id} style={styles.billCard}>
              <View style={styles.billHeader}>
                <View style={styles.headerCopy}>
                  <AppText variant="subtitle">{bill.name}</AppText>
                  <AppText muted>
                    {formatDueDate(bill.nextDueAt)} - {bill.frequency}
                  </AppText>
                </View>
                <StatusBadge label={statusLabel(bill)} tone={statusTone(bill)} />
              </View>

              <View style={styles.billMeta}>
                <View>
                  <AppText variant="caption" muted>
                    Amount
                  </AppText>
                  <MoneyAmount amountMinor={bill.amountMinor} currency={bill.currency} size="subtitle" />
                </View>
                <View>
                  <AppText variant="caption" muted>
                    Reminder
                  </AppText>
                  <AppText>{bill.remindDaysBefore}d before</AppText>
                </View>
              </View>

              <AppText muted>
                {bill.autoCreateExpense
                  ? `Auto-create is enabled for ${formatMoney(bill.amountMinor, bill.currency)} when backend jobs are connected.`
                  : "Auto-create is off; mark this bill paid after you settle it."}
              </AppText>

              <View style={styles.actions}>
                {bill.status === "active" ? (
                  <>
                    <Button variant="secondary" size="compact" icon="checkmark-circle" onPress={() => markPaid(bill.id)}>
                      Mark paid
                    </Button>
                    <Button variant="ghost" size="compact" icon="pause-circle" onPress={() => updateStatus(bill.id, "paused")}>
                      Pause
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" size="compact" icon="play-circle" onPress={() => updateStatus(bill.id, "active")}>
                    Resume
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="compact"
                  icon="trash"
                  onPress={() =>
                    Alert.alert("Cancel recurring bill?", `${bill.name} will stop affecting safe daily spend.`, [
                      { text: "Keep", style: "cancel" },
                      { text: "Cancel bill", style: "destructive", onPress: () => updateStatus(bill.id, "cancelled") }
                    ])
                  }
                >
                  Cancel
                </Button>
              </View>
            </Card>
          ))}

          <View style={styles.addMoreAction}>
            <Button size="compact" icon="add-circle" accessibilityLabel="Add another recurring bill" onPress={() => router.push("/modals/recurring-bill-form")}>
              Add another recurring bill
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  headerCopy: {
    flex: 1
  },
  title: {
    fontSize: 30,
    lineHeight: 36
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20
  },
  summary: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCopy: {
    fontSize: 14,
    lineHeight: 20
  },
  billCard: {
    gap: spacing.sm,
    padding: spacing.md
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  billMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  actions: {
    gap: spacing.xs
  },
  addMoreAction: {
    paddingTop: 0
  }
});
