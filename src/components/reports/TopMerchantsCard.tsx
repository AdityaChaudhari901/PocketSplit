import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { TopMerchantRow } from "@/features/reports/reportsService";
import type { CurrencyCode } from "@/types/domain";

interface TopMerchantsCardProps {
  rows?: TopMerchantRow[];
  currency: CurrencyCode;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const percentOf = (value: number, total: number): number => (total > 0 ? Number((BigInt(value) * 100n) / BigInt(total)) : 0);

export const TopMerchantsCard = ({ rows = [], currency, loading, error, onRetry }: TopMerchantsCardProps) => {
  const max = Math.max(...rows.map((row) => row.totalMinor), 0);

  if (loading) {
    return <SectionLoading title="Top merchants" />;
  }

  if (error) {
    return <SectionError title="Top merchants" message={error.message} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return <EmptyState icon="storefront-outline" title="No merchant data" body="Merchant rankings appear after you add expenses for this month." />;
  }

  return (
    <Card style={styles.card}>
      <View>
        <AppText variant="subtitle">Top merchants</AppText>
        <AppText variant="caption" muted>
          Highest spend this month
        </AppText>
      </View>
      {rows.map((row, index) => (
        <View key={row.merchant} style={styles.row} accessible accessibilityLabel={`${row.merchant}, ${formatMoney(row.totalMinor, currency)}, ${row.count} transactions`}>
          <View style={styles.labelRow}>
            <View style={styles.merchantCopy}>
              <AppText variant="body" numberOfLines={1}>
                {index + 1}. {row.merchant}
              </AppText>
              <AppText variant="caption" muted>
                {row.count} {row.count === 1 ? "transaction" : "transactions"}
              </AppText>
            </View>
            <AppText variant="body" numberOfLines={1}>
              {formatMoney(row.totalMinor, currency)}
            </AppText>
          </View>
          <ProgressBar progress={percentOf(row.totalMinor, max)} tone="warning" />
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  merchantCopy: {
    flex: 1,
    minWidth: 0
  },
  stateCard: {
    minHeight: 150,
    gap: spacing.md,
    justifyContent: "center"
  }
});
