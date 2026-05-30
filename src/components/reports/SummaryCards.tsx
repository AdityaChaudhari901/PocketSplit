import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { MonthlySummary } from "@/features/reports/reportsService";
import type { CurrencyCode } from "@/types/domain";

interface SummaryCardsProps {
  summary?: MonthlySummary;
  currency: CurrencyCode;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const SummaryCards = ({ summary, currency, loading, error, onRetry }: SummaryCardsProps) => {
  if (loading) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2].map((item) => (
          <MetricCard key={item} label="Loading" value="" tone="net" loading />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <Card style={styles.errorCard}>
        <AppText variant="subtitle">Monthly summary</AppText>
        <AppText muted>{error.message}</AppText>
        {onRetry ? (
          <Button variant="secondary" onPress={onRetry}>
            Retry
          </Button>
        ) : null}
      </Card>
    );
  }

  return (
    <View style={styles.grid}>
      <MetricCard label="Total Income" value={formatMoney(summary?.totalIncomeMinor ?? 0, currency)} tone="income" />
      <MetricCard label="Total Expense" value={formatMoney(summary?.totalExpenseMinor ?? 0, currency)} tone="expense" />
      <MetricCard label="Net Savings" value={formatMoney(summary?.netSavingsMinor ?? 0, currency)} tone="net" />
    </View>
  );
};

const MetricCard = ({ label, value, tone, loading }: { label: string; value: string; tone: "income" | "expense" | "net"; loading?: boolean }) => {
  const theme = useAppTheme();
  const color = tone === "income" ? theme.colors.success : tone === "expense" ? theme.colors.danger : theme.colors.primary;

  return (
    <Card elevated={false} style={styles.card}>
      <AppText variant="caption" muted numberOfLines={1}>
        {label}
      </AppText>
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <AppText variant="body" style={{ color }} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  card: {
    flex: 1,
    minHeight: 82,
    padding: spacing.md,
    justifyContent: "center",
    gap: spacing.sm
  },
  errorCard: {
    gap: spacing.md
  }
});
