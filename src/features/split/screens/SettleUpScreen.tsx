import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { getSimplifiedSettlementPlan } from "@/services/split.service";
import { useAppStore } from "@/store/app.store";

export const SettleUpScreen = () => {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const state = useAppStore();
  const group = state.groups.find((item) => item.id === groupId) ?? state.groups[0];

  if (!group) {
    return (
      <Screen>
        <EmptyState icon="people" title="No group available" body="Create a split group before settling balances." />
      </Screen>
    );
  }

  const payments = getSimplifiedSettlementPlan({
    expenses: state.getGroupExpenses(group.id),
    members: group.members,
    currency: group.currency
  });

  return (
    <Screen>
      <View>
        <AppText variant="hero">Settle Up</AppText>
        <AppText muted>Suggested payments minimize transfers. This records payment proof only; it does not move money.</AppText>
      </View>
      <Card style={styles.card}>
        <AppText variant="subtitle">{group.name}</AppText>
        {payments.length > 0 ? (
          payments.map((payment) => (
            <View key={`${payment.fromMemberId}-${payment.toMemberId}-${payment.amountMinor}`} style={styles.payment}>
              <View>
                <AppText>
                  {group.members.find((member) => member.id === payment.fromMemberId)?.displayName} pays{" "}
                  {group.members.find((member) => member.id === payment.toMemberId)?.displayName}
                </AppText>
                <AppText variant="caption" muted>
                  Simplified settlement
                </AppText>
              </View>
              <MoneyAmount amountMinor={payment.amountMinor} currency={payment.currency} size="body" />
            </View>
          ))
        ) : (
          <EmptyState icon="checkmark-circle" title="All settled" body="No transfers are needed for this group." />
        )}
      </Card>
      <Button disabled={payments.length === 0} onPress={() => router.push(`/modals/payment-proof?groupId=${group.id}`)} icon="cash">
        Mark payment as paid
      </Button>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  payment: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
