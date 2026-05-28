import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { spacing, useAppTheme } from "@/lib/theme";
import type { UpcomingBill } from "@/services/recurring-bill.service";
import type { CurrencyCode } from "@/types/domain";

interface UpcomingBillsCardProps {
  upcomingBills: UpcomingBill[];
  expectedBillsMinor: number;
  currency: CurrencyCode;
  onMarkPaid: (billId: string) => void;
}

const dueLabel = (bill: UpcomingBill): string => {
  if (bill.daysUntilDue < 0) {
    return `${Math.abs(bill.daysUntilDue)}d overdue`;
  }

  if (bill.daysUntilDue === 0) {
    return "Due today";
  }

  if (bill.daysUntilDue === 1) {
    return "Due tomorrow";
  }

  return `Due in ${bill.daysUntilDue}d`;
};

export const UpcomingBillsCard = ({ upcomingBills, expectedBillsMinor, currency, onMarkPaid }: UpcomingBillsCardProps) => {
  const router = useRouter();
  const theme = useAppTheme();
  const visibleBills = upcomingBills.slice(0, 3);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: theme.colors.warningSoft }]}>
            <Ionicons name="calendar" size={18} color={theme.colors.warning} />
          </View>
          <View style={styles.copy}>
            <AppText variant="subtitle">Upcoming bills</AppText>
            <AppText muted>Reserved before calculating safe daily spend.</AppText>
          </View>
        </View>
        <MoneyAmount amountMinor={expectedBillsMinor} currency={currency} size="subtitle" />
      </View>

      {visibleBills.length > 0 ? (
        <View style={styles.list}>
          {visibleBills.map((item) => (
            <View key={item.bill.id} style={[styles.billRow, { borderColor: theme.colors.border }]}>
              <View style={styles.billCopy}>
                <AppText variant="body">{item.bill.name}</AppText>
                <StatusBadge label={dueLabel(item)} tone={item.isOverdue ? "danger" : item.daysUntilDue <= item.bill.remindDaysBefore ? "warning" : "neutral"} />
              </View>
              <View style={styles.amount}>
                <MoneyAmount amountMinor={item.bill.amountMinor} currency={item.bill.currency} size="body" />
                <Button variant="ghost" icon="checkmark-circle" accessibilityLabel={`Mark ${item.bill.name} as paid`} onPress={() => onMarkPaid(item.bill.id)}>
                  Paid
                </Button>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <AppText muted>No bills due in the next 30 days.</AppText>
        </View>
      )}

      <View style={styles.actions}>
        <Button variant="secondary" icon="add-circle" onPress={() => router.push("/modals/recurring-bill-form")}>
          Add bill
        </Button>
        <Button variant="ghost" icon="list" onPress={() => router.push("/modals/recurring-bills")}>
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
  list: {
    gap: spacing.sm
  },
  billRow: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.md
  },
  billCopy: {
    gap: spacing.xs
  },
  amount: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  empty: {
    paddingVertical: spacing.sm
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  }
});
