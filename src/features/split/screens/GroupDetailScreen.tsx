import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Share, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ExportSheet } from "@/components/export/ExportSheet";
import { BalanceRow } from "@/components/split/BalanceRow";
import { MemberAvatarStack } from "@/components/split/MemberAvatarStack";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const GroupDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();
  const group = state.groups.find((item) => item.id === id);
  const [exportVisible, setExportVisible] = useState(false);

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
  const inviteLink = `https://pocketsplit.app/join/${group.id.replace(/^group-/, "").slice(0, 8).toUpperCase()}`;

  const shareInviteLink = async () => {
    try {
      await Share.share({
        title: `Join ${group.name} on PocketSplit`,
        message: `Join ${group.name} on PocketSplit: ${inviteLink}`,
        url: inviteLink
      });
    } catch {
      Alert.alert("Share failed", "Could not open the share sheet. Please try again.");
    }
  };

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
          <Button onPress={() => setExportVisible(true)} variant="secondary" icon="share-outline">
            Export
          </Button>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.inviteHeader}>
          <View style={[styles.inviteIcon, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="person-add-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <AppText variant="subtitle">Invite members</AppText>
            <AppText variant="caption" muted>
              Add contacts or share the group invite link.
            </AppText>
          </View>
        </View>
        <View style={styles.actions}>
          <Button onPress={() => router.push(`/modals/add-group-members?groupId=${group.id}`)} variant="secondary" icon="person-add-outline">
            Add members
          </Button>
          <Button onPress={shareInviteLink} variant="secondary" icon="link-outline">
            Share link
          </Button>
        </View>
        <View style={[styles.inviteLink, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
          <Ionicons name="link-outline" size={17} color={theme.colors.primary} />
          <AppText variant="caption" muted numberOfLines={1}>
            {inviteLink}
          </AppText>
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

      <ExportSheet
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
        initialParams={{
          scope: "group",
          format: "csv",
          groupId: group.id,
          includeSettlements: true
        }}
      />
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
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  inviteLink: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  timelineRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
