import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { BalanceRow } from "@/components/split/BalanceRow";
import { MemberAvatarStack } from "@/components/split/MemberAvatarStack";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const GroupDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const state = useAppStore();
  const group = state.groups.find((item) => item.id === id);

  if (!group) {
    return (
      <Screen>
        <EmptyState icon="alert-circle" title="Group not found" body="This group may have been deleted or you may not have access." />
      </Screen>
    );
  }

  const expenses = state.getGroupExpenses(group.id);
  const balances = state.getGroupBalances(group.id);
  const currentMember = group.members.find((member) => member.isCurrentUser) ?? group.members[0];
  const currentBalance = balances.find((balance) => balance.memberId === currentMember?.id)?.netMinor ?? 0;
  const totalSpentMinor = expenses.reduce((total, expense) => total + expense.amountMinor, 0);
  const paidByUser = expenses.filter((expense) => expense.paidByMemberId === currentMember?.id).reduce((total, expense) => total + expense.amountMinor, 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">{group.name}</AppText>
          <AppText muted>
            {group.members.length} members • {new Intl.NumberFormat("en-IN", { style: "currency", currency: group.currency }).format(totalSpentMinor / 100)} total spent
          </AppText>
        </View>
        <MemberAvatarStack members={group.members} />
      </View>

      <Card style={styles.card}>
        <View style={styles.metrics}>
          <View>
            <AppText variant="caption" muted>
              Your net balance
            </AppText>
            <MoneyAmount amountMinor={Math.abs(currentBalance)} currency={group.currency} />
            <AppText variant="caption" muted>
              {currentBalance >= 0 ? "You are owed" : "You owe"}
            </AppText>
          </View>
          <View>
            <AppText variant="caption" muted>
              Paid by you
            </AppText>
            <MoneyAmount amountMinor={paidByUser} currency={group.currency} />
          </View>
        </View>
        <View style={styles.actions}>
          <Button onPress={() => router.push(`/modals/add-split-expense?groupId=${group.id}`)} icon="add">
            Add Expense
          </Button>
          <Button onPress={() => router.push("/modals/receipt-scanner")} variant="secondary" icon="scan">
            Scan Receipt
          </Button>
          <Button onPress={() => router.push(`/modals/settle-up?groupId=${group.id}`)} variant="secondary" icon="swap-horizontal">
            Settle Up
          </Button>
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Balances</AppText>
        {balances.map((balance) => (
          <BalanceRow
            key={balance.memberId}
            netMinor={balance.netMinor}
            currency={group.currency}
            member={group.members.find((member) => member.id === balance.memberId)}
          />
        ))}
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Expense timeline</AppText>
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.timelineRow}>
              <View>
                <AppText>{expense.title}</AppText>
                <AppText variant="caption" muted>
                  Paid by {group.members.find((member) => member.id === expense.paidByMemberId)?.displayName ?? "Unknown"} • v{expense.version}
                </AppText>
              </View>
              <MoneyAmount amountMinor={expense.amountMinor} currency={expense.currency} size="body" />
            </View>
          ))
        ) : (
          <EmptyState icon="receipt" title="No group expenses" body="Add a shared expense or scan a receipt to start the timeline." />
        )}
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Activity log</AppText>
        {state.activityLogs
          .filter((log) => log.groupId === group.id)
          .slice(0, 5)
          .map((log) => (
            <AppText key={log.id} muted>
              {log.action} {log.entityType} on {log.createdAt.slice(0, 10)}
            </AppText>
          ))}
        {state.activityLogs.filter((log) => log.groupId === group.id).length === 0 ? <AppText muted>No activity yet.</AppText> : null}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1
  },
  card: {
    gap: spacing.md
  },
  metrics: {
    gap: spacing.lg
  },
  actions: {
    gap: spacing.md
  },
  timelineRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
