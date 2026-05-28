import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { SplitGroupCard } from "@/components/split/SplitGroupCard";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const SplitHomeScreen = () => {
  const router = useRouter();
  const state = useAppStore();

  const groupSummaries = state.groups.map((group) => {
    const expenses = state.getGroupExpenses(group.id);
    const currentMember = group.members.find((member) => member.isCurrentUser) ?? group.members[0];
    const balances = state.getGroupBalances(group.id);
    const currentBalance = balances.find((balance) => balance.memberId === currentMember?.id)?.netMinor ?? 0;
    const totalSpentMinor = expenses.reduce((total, expense) => total + expense.amountMinor, 0);
    return { group, currentBalance, totalSpentMinor };
  });

  const totalOwedToUser = groupSummaries.filter((item) => item.currentBalance > 0).reduce((total, item) => total + item.currentBalance, 0);
  const totalUserOwes = groupSummaries.filter((item) => item.currentBalance < 0).reduce((total, item) => total + Math.abs(item.currentBalance), 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="hero">Split</AppText>
          <AppText muted>Groups, balances, settlement plans, and payment proof records.</AppText>
        </View>
        <Button onPress={() => router.push("/modals/create-group")} icon="add">
          Group
        </Button>
      </View>

      <Card style={styles.balanceCard}>
        <View>
          <AppText variant="caption" muted>
            You are owed
          </AppText>
          <MoneyAmount amountMinor={totalOwedToUser} currency={state.profile.currency} />
        </View>
        <View>
          <AppText variant="caption" muted>
            You owe
          </AppText>
          <MoneyAmount amountMinor={totalUserOwes} currency={state.profile.currency} />
        </View>
        <Button variant="secondary" icon="swap-horizontal" onPress={() => router.push("/modals/settle-up")}>
          Settle Up
        </Button>
      </Card>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">Groups</AppText>
        <Button variant="ghost" onPress={() => router.push("/modals/add-split-expense")}>
          Add expense
        </Button>
      </View>

      {groupSummaries.length > 0 ? (
        groupSummaries.map((item) => (
          <SplitGroupCard
            key={item.group.id}
            group={item.group}
            netMinor={item.currentBalance}
            totalSpentMinor={item.totalSpentMinor}
            currency={item.group.currency}
            onPress={() => router.push(`/modals/group-detail/${item.group.id}`)}
          />
        ))
      ) : (
        <EmptyState
          icon="people"
          title="No split groups yet"
          body="Create a group for trips, flatmates, family budgets, or office lunches."
          actionLabel="Create Group"
          onAction={() => router.push("/modals/create-group")}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  balanceCard: {
    gap: spacing.md
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  }
});
