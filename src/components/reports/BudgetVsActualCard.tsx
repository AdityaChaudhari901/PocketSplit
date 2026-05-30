import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { BudgetVsActualRow } from "@/features/reports/reportsService";
import type { CurrencyCode } from "@/types/domain";

interface BudgetVsActualCardProps {
  rows?: BudgetVsActualRow[];
  currency: CurrencyCode;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const BudgetVsActualCard = ({ rows = [], currency, loading, error, onRetry }: BudgetVsActualCardProps) => {
  if (loading) {
    return <SectionLoading title="Budget vs actual" />;
  }

  if (error) {
    return <SectionError title="Budget vs actual" message={error.message} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card style={styles.card}>
      <View>
        <AppText variant="subtitle">Budget vs actual</AppText>
        <AppText variant="caption" muted>
          Category guardrails for the selected month
        </AppText>
      </View>
      {rows.map((row) => (
        <View key={row.categoryId} style={styles.row} accessible accessibilityLabel={`${row.categoryName}, ${row.percentage} percent of budget used`}>
          <View style={styles.labelRow}>
            <View style={styles.categoryCopy}>
              <AppText variant="body" numberOfLines={1}>
                {row.categoryName}
              </AppText>
              <AppText variant="caption" muted numberOfLines={1}>
                {formatMoney(row.actualMinor, currency)} of {formatMoney(row.budgetedMinor, currency)}
              </AppText>
            </View>
            <AppText variant="caption" style={{ fontWeight: "900" }}>
              {row.percentage}%
            </AppText>
          </View>
          <ProgressBar progress={row.percentage} tone={row.isOverBudget ? "danger" : "success"} />
        </View>
      ))}
    </Card>
  );
};

const SectionLoading = ({ title }: { title: string }) => {
  const theme = useAppTheme();
  return (
    <Card style={styles.stateCard}>
      <AppText variant="subtitle">{title}</AppText>
      <ActivityIndicator color={theme.colors.primary} />
    </Card>
  );
};

const SectionError = ({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) => (
  <Card style={styles.stateCard}>
    <AppText variant="subtitle">{title}</AppText>
    <AppText muted>{message}</AppText>
    {onRetry ? (
      <Button variant="secondary" onPress={onRetry}>
        Retry
      </Button>
    ) : null}
  </Card>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  row: {
    gap: spacing.sm
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  categoryCopy: {
    flex: 1,
    minWidth: 0
  },
  stateCard: {
    minHeight: 150,
    gap: spacing.md,
    justifyContent: "center"
  }
});
