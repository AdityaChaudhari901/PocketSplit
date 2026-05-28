import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { PaywallCard } from "@/components/cards/PaywallCard";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { canUseFeature } from "@/services/entitlement.service";
import { useAppStore } from "@/store/app.store";

export const SmartReceiptSplitScreen = () => {
  const router = useRouter();
  const state = useAppStore();
  const group = state.groups[0];
  const canUse = canUseFeature(state.entitlement, "advanced_split");
  const demoItems = [
    { label: "Paneer Pizza", amountMinor: 48000, members: ["Rahul", "Amit", "Priya"] },
    { label: "Coke", amountMinor: 12000, members: ["Rahul", "Neha"] },
    { label: "Service Charge", amountMinor: 9600, members: ["Split equally"] }
  ];

  return (
    <Screen>
      <View>
        <AppText variant="hero">Smart receipt split</AppText>
        <AppText muted>AI detects items. Users choose who consumed each item before creating the final split.</AppText>
      </View>
      {!canUse ? <PaywallCard title="Smart receipt split is Premium" body="Upgrade to Premium for item-wise AI receipt splitting and smart settlement." /> : null}
      <Card style={styles.card}>
        {demoItems.map((item) => (
          <View key={item.label} style={styles.item}>
            <View style={styles.itemHeader}>
              <AppText variant="subtitle">{item.label}</AppText>
              <MoneyAmount amountMinor={item.amountMinor} currency={state.profile.currency} size="body" />
            </View>
            <View style={styles.pills}>
              {item.members.map((member) => (
                <CategoryPill key={member} label={member} selected />
              ))}
            </View>
          </View>
        ))}
      </Card>
      <Button
        disabled={!canUse || !group}
        onPress={() => router.push(group ? `/modals/add-split-expense?groupId=${group.id}` : "/modals/create-group")}
        icon="people"
      >
        Create final split
      </Button>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg
  },
  item: {
    gap: spacing.sm
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
