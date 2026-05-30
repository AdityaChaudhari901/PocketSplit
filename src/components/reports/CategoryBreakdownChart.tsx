import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { PieChart, type pieDataItem } from "react-native-gifted-charts";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/money";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { CategoryBreakdownRow } from "@/features/reports/reportsService";
import type { CurrencyCode } from "@/types/domain";

interface CategoryBreakdownChartProps {
  rows?: CategoryBreakdownRow[];
  currency: CurrencyCode;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export const CategoryBreakdownChart = ({ rows = [], currency, loading, error, onRetry }: CategoryBreakdownChartProps) => {
  const theme = useAppTheme();
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
  const focusedRow = rows.find((row) => row.categoryId === focusedCategoryId) ?? rows[0];
  const data = useMemo<pieDataItem[]>(
    () =>
      rows.map((row) => ({
        value: row.totalMinor,
        color: row.categoryColor,
        focused: focusedCategoryId === row.categoryId,
        onPress: () => setFocusedCategoryId(row.categoryId)
      })),
    [focusedCategoryId, rows]
  );

  if (loading) {
    return <SectionLoading title="Category breakdown" />;
  }

  if (error) {
    return <SectionError title="Category breakdown" message={error.message} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return <EmptyState icon="pie-chart-outline" title="No category data" body="This month has no categorized expenses yet." />;
  }

  return (
    <Card style={styles.card} accessible accessibilityLabel="Category breakdown donut chart">
      <View style={styles.header}>
        <View>
          <AppText variant="subtitle">Category breakdown</AppText>
          <AppText variant="caption" muted>
            Tap a segment or row to highlight it
          </AppText>
        </View>
      </View>

      <View style={styles.chartRow}>
        <PieChart
          data={data}
          donut
          radius={78}
          innerRadius={50}
          focusOnPress
          centerLabelComponent={() =>
            focusedRow ? (
              <View style={styles.centerLabel}>
                <AppText variant="caption" muted numberOfLines={1}>
                  {focusedRow.categoryName}
                </AppText>
                <AppText variant="caption" style={{ color: theme.colors.text }} numberOfLines={1}>
                  {focusedRow.percentage}%
                </AppText>
              </View>
            ) : null
          }
        />
        <View style={styles.legend}>
          {rows.map((row) => {
            const selected = focusedRow?.categoryId === row.categoryId;
            return (
              <Pressable
                key={row.categoryId}
                accessibilityRole="button"
                accessibilityLabel={`${row.categoryName} ${row.percentage} percent`}
                accessibilityState={{ selected }}
                onPress={() => setFocusedCategoryId(row.categoryId)}
                style={({ pressed }) => [styles.legendRow, selected ? { backgroundColor: theme.colors.primarySoft } : null, pressed ? styles.pressed : null]}
              >
                <View style={[styles.colorDot, { backgroundColor: row.categoryColor }]} />
                <View style={styles.legendCopy}>
                  <AppText variant="caption" numberOfLines={1}>
                    {row.categoryName}
                  </AppText>
                  <AppText variant="caption" muted numberOfLines={1}>
                    {formatMoney(row.totalMinor, currency)} • {row.percentage}%
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
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
  header: {
    gap: spacing.xs
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg
  },
  centerLabel: {
    width: 86,
    alignItems: "center"
  },
  legend: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs
  },
  legendRow: {
    minHeight: 44,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  legendCopy: {
    flex: 1,
    minWidth: 0
  },
  stateCard: {
    minHeight: 150,
    gap: spacing.md,
    justifyContent: "center"
  },
  pressed: {
    opacity: 0.72
  }
});
