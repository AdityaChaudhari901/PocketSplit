import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MemberAvatarStack } from "@/components/split/MemberAvatarStack";
import { spacing } from "@/lib/theme";
import type { CurrencyCode, SplitGroup } from "@/types/domain";

interface SplitGroupCardProps {
  group: SplitGroup;
  netMinor: number;
  totalSpentMinor: number;
  currency: CurrencyCode;
  onPress?: () => void;
}

export const SplitGroupCard = ({ group, netMinor, totalSpentMinor, currency, onPress }: SplitGroupCardProps) => {
  const balanceLabel = netMinor > 0 ? "You are owed" : netMinor < 0 ? "You owe" : "Settled";
  const tone = netMinor > 0 ? "success" : netMinor < 0 ? "danger" : "neutral";

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${group.name}`} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <AppText variant="subtitle">{group.name}</AppText>
            <AppText variant="caption" muted>
              {group.members.length} members • {new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(totalSpentMinor / 100)} total spent
            </AppText>
          </View>
          <MemberAvatarStack members={group.members} />
        </View>
        <View style={styles.footer}>
          <View>
            <AppText variant="caption" muted>
              {balanceLabel}
            </AppText>
            <MoneyAmount amountMinor={Math.abs(netMinor)} currency={currency} size="subtitle" />
          </View>
          <StatusBadge label={balanceLabel} tone={tone} />
        </View>
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  copy: {
    flex: 1
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  }
});
