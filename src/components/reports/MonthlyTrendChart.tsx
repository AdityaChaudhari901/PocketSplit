import { ActivityIndicator, StyleSheet, View } from "react-native";
import { BarChart, type stackDataItem } from "react-native-gifted-charts";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { MonthlyTrendPoint } from "@/features/reports/reportsService";
import type { CurrencyCode } from "@/types/domain";

interface MonthlyTrendChartProps {
  data?: MonthlyTrendPoint[];
  currency: CurrencyCode;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const monthLabel = (month: string): string =>
  new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(`${month}-01T00:00:00.000Z`));

const hasTrendData = (data: MonthlyTrendPoint[] = []): boolean => data.some((item) => item.incomeMinor > 0 || item.expenseMinor > 0);

export const MonthlyTrendChart = ({ data = [], currency, loading, error, onRetry }: MonthlyTrendChartProps) => {
  const theme = useAppTheme();
  const chartData: stackDataItem[] = data.map((item) => ({
    label: monthLabel(item.month),
    stacks: [
      { value: item.incomeMinor, color: theme.colors.success },
      { value: item.expenseMinor, color: theme.colors.danger }
    ]
  }));

  if (loading) {
    return <SectionLoading title="Monthly trend" />;
  }

  if (error) {
    return <SectionError title="Monthly trend" message={error.message} onRetry={onRetry} />;
  }

  if (!hasTrendData(data)) {
    return <EmptyState icon="bar-chart-outline" title="No trend data yet" body="Add income or expenses to see month-over-month movement." />;
  }

  return (
    <Card style={styles.card} accessible accessibilityLabel="Monthly trend chart showing income and expense for the last six months">
      <View style={styles.header}>
        <View>
          <AppText variant="subtitle">Monthly trend</AppText>
          <AppText variant="caption" muted>
            Last {data.length} months
          </AppText>
        </View>
        <View style={styles.legend}>
          <LegendDot color={theme.colors.success} label="Income" />
          <LegendDot color={theme.colors.danger} label="Expense" />
        </View>
      </View>
      <BarChart
        stackData={chartData}
        height={170}
        barWidth={24}
        spacing={18}
        initialSpacing={4}
        noOfSections={4}
        yAxisLabelWidth={54}
        yAxisTextStyle={{ color: theme.colors.subtext, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.colors.subtext, fontSize: 11, fontWeight: "700" }}
        xAxisColor={theme.colors.border}
        yAxisColor={theme.colors.border}
        rulesColor={theme.colors.border}
        formatYLabel={(value) => formatMoney(Number(value), currency)}
      />
    </Card>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <AppText variant="caption" muted>
      {label}
    </AppText>
  </View>
);

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
    gap: spacing.md,
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  legend: {
    alignItems: "flex-end",
    gap: spacing.xs
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  stateCard: {
    minHeight: 150,
    gap: spacing.md,
    justifyContent: "center"
  }
});
