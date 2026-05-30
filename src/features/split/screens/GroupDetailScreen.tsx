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
import { getActiveSplitMembers, hasMinimumSplitMembers } from "@/lib/split";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const GroupDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();
  const deleteGroup = useAppStore((store) => store.deleteGroup);
  const group = state.groups.find((item) => item.id === id && !item.deletedAt);
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
  const activeMembers = getActiveSplitMembers(group.members);
  const canAddExpense = hasMinimumSplitMembers(group.members);
  const activeMemberLabel = activeMembers.length === 1 ? "active member" : "active members";
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

  const openAddExpense = () => {
    if (!canAddExpense) {
      Alert.alert("Add members first", "Add at least one more member before creating a split expense.");
      return;
    }

    router.push(`/modals/add-split-expense?groupId=${group.id}`);
  };

  const confirmDeleteGroup = () => {
    Alert.alert("Delete group?", `${group.name} will be removed from your split groups. Existing records are kept safely in local history.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteGroup(group.id);
          router.replace("/split");
        }
      }
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">{group.name}</AppText>
          <AppText muted>
            {activeMembers.length} {activeMembers.length === 1 ? "member" : "members"} • {new Intl.NumberFormat("en-IN", { style: "currency", currency: group.currency }).format(totalSpentMinor / 100)} total spent
          </AppText>
        </View>
        <MemberAvatarStack members={group.members} />
      </View>

      <View style={styles.manageActions}>
        <Button variant="secondary" size="compact" icon="create-outline" onPress={() => router.push(`/modals/edit-group/${group.id}`)}>
          Edit group
        </Button>
        <Button variant="danger" size="compact" icon="trash-outline" onPress={confirmDeleteGroup}>
          Delete
        </Button>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.metricRow}>
          <View style={styles.metricBlock}>
            <AppText variant="caption" muted>
              Your net balance
            </AppText>
            <MoneyAmount amountMinor={Math.abs(currentBalance)} currency={group.currency} />
            <AppText variant="caption" muted>
              {currentBalance >= 0 ? "You are owed" : "You owe"}
            </AppText>
          </View>
          <View style={styles.metricBlock}>
            <AppText variant="caption" muted>
              Paid by you
            </AppText>
            <MoneyAmount amountMinor={paidByUser} currency={group.currency} />
            <AppText variant="caption" muted>
              Across this group
            </AppText>
          </View>
        </View>
        {canAddExpense ? (
          <View style={styles.actionGrid}>
            <Button onPress={openAddExpense} icon="add">
              Add bill
            </Button>
            <Button onPress={() => router.push(`/modals/settle-up?groupId=${group.id}`)} variant="secondary" icon="swap-horizontal">
              Settle up
            </Button>
            <Button onPress={() => setExportVisible(true)} variant="secondary" icon="share-outline">
              Export
            </Button>
          </View>
        ) : null}
      </Card>

      {!canAddExpense ? (
        <Card style={[styles.nudgeCard, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryBorder }]}>
          <View style={[styles.inviteIcon, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="person-add-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.nudgeCopy}>
            <AppText variant="subtitle">Add members to start splitting</AppText>
            <AppText variant="caption" muted>
              This group has {activeMembers.length} {activeMemberLabel}. Add one more person or contact before adding shared expenses.
            </AppText>
          </View>
          <View style={styles.inlineActions}>
            <Button onPress={() => router.push(`/modals/add-group-members?groupId=${group.id}`)} variant="secondary" size="compact" icon="person-add-outline">
              Add members
            </Button>
            <Button onPress={shareInviteLink} size="compact" variant="secondary" icon="link-outline">
              Share link
            </Button>
          </View>
        </Card>
      ) : null}

      {canAddExpense ? (
        <Card style={styles.card}>
          <View style={styles.membersHeader}>
            <View style={styles.headerCopy}>
              <AppText variant="subtitle">Members</AppText>
              <AppText variant="caption" muted>
                {activeMembers.length} active members. Add contacts manually until invite join is ready.
              </AppText>
            </View>
            <MemberAvatarStack members={activeMembers} />
          </View>
          <View style={styles.inlineActions}>
            <Button onPress={() => router.push(`/modals/add-group-members?groupId=${group.id}`)} variant="secondary" icon="person-add-outline">
              Add members
            </Button>
            <Button onPress={shareInviteLink} variant="secondary" icon="link-outline">
              Share link
            </Button>
          </View>
        </Card>
      ) : null}

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
              <View style={styles.timelineCopy}>
                <AppText>{expense.title}</AppText>
                <AppText variant="caption" muted>
                  Paid by {group.members.find((member) => member.id === expense.paidByMemberId)?.displayName ?? "Unknown"} • {new Date(expense.occurredAt).toLocaleDateString()}
                </AppText>
              </View>
              <MoneyAmount amountMinor={expense.amountMinor} currency={expense.currency} size="body" />
            </View>
          ))
        ) : (
          <EmptyState icon="receipt" title="No group expenses" body="Add a shared expense to start the timeline." />
        )}
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
  manageActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  summaryCard: {
    gap: spacing.lg
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  metricBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs
  },
  actions: {
    gap: spacing.md
  },
  actionGrid: {
    gap: spacing.sm
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  nudgeCard: {
    borderWidth: 1,
    gap: spacing.md
  },
  nudgeCopy: {
    gap: spacing.xs
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0
  },
  timelineRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
