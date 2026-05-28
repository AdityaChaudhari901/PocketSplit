import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/money";
import { spacing } from "@/lib/theme";
import type { BudgetUsage } from "@/lib/money";
import type { Category, CurrencyCode } from "@/types/domain";

interface BudgetProgressCardProps {
  category: Category;
  usage: BudgetUsage;
  currency: CurrencyCode;
}

export const BudgetProgressCard = ({ category, usage, currency }: BudgetProgressCardProps) => {
  const tone = usage.status === "safe" ? "success" : usage.status === "watch" ? "warning" : "danger";
  return (
    <Card elevated={false} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="subtitle">{category.name}</AppText>
          <AppText variant="caption" muted>
            {formatMoney(usage.spentMinor, currency)} of {formatMoney(usage.budgetMinor, currency)}
          </AppText>
        </View>
        <AppText variant="subtitle">{usage.percentage}%</AppText>
      </View>
      <ProgressBar progress={usage.percentage} tone={tone} />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  copy: {
    flex: 1
  }
});
