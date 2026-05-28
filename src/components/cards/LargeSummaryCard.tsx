import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { pulseLabel } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { CurrencyCode, MoneyPulseStatus } from "@/types/domain";

interface LargeSummaryCardProps {
  availableMinor: number;
  safeDailySpendMinor: number;
  pulseStatus: MoneyPulseStatus;
  currency: CurrencyCode;
}

export const LargeSummaryCard = ({ availableMinor, safeDailySpendMinor, pulseStatus, currency }: LargeSummaryCardProps) => {
  const theme = useAppTheme();
  const tone = pulseStatus === "healthy" || pulseStatus === "saving_mode" ? "success" : pulseStatus === "overspending" ? "danger" : "warning";

  return (
    <Card style={[styles.card, { backgroundColor: theme.mode === "dark" ? theme.colors.surfaceRaised : theme.colors.surface }]}>
      <View style={styles.header}>
        <AppText variant="label" muted>
          Available this month
        </AppText>
        <StatusBadge label={pulseLabel(pulseStatus)} tone={tone} />
      </View>
      <MoneyAmount amountMinor={availableMinor} currency={currency} size="hero" />
      <AppText muted>
        You can safely spend {new Intl.NumberFormat("en-IN", { style: "currency" as const, currency }).format(safeDailySpendMinor / 100)}/day for the rest of this month.
      </AppText>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
