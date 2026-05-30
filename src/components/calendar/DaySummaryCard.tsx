import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import type { DayExpenseSummary } from "@/features/calendar/calendarService";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { CurrencyCode } from "@/types/domain";

interface DaySummaryCardProps {
  date: string;
  summary?: DayExpenseSummary;
  currency: CurrencyCode;
}

const readableDate = (date: string): string =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00.000Z`));

export const DaySummaryCard = ({ date, summary, currency }: DaySummaryCardProps) => {
  const theme = useAppTheme();
  const incomeMinor = summary?.totalIncomeMinor ?? 0;
  const expenseMinor = summary?.totalExpenseMinor ?? 0;
  const netMinor = incomeMinor - expenseMinor;
  const netColor = netMinor >= 0 ? theme.colors.success : theme.colors.danger;

  return (
    <Card elevated={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <AppText variant="label" muted>
            Selected day
          </AppText>
          <AppText variant="subtitle">{readableDate(date)}</AppText>
        </View>
        <View style={styles.netBlock}>
          <AppText variant="caption" muted>
            Net
          </AppText>
          <AppText variant="body" style={{ color: netColor }} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(netMinor, currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.stats}>
        <SummaryStat label="Income" value={formatMoney(incomeMinor, currency)} tone="income" />
        <SummaryStat label="Expense" value={formatMoney(expenseMinor, currency)} tone="expense" />
        <SummaryStat label="Entries" value={`${summary?.expenseCount ?? 0}`} />
      </View>
    </Card>
  );
};

const SummaryStat = ({ label, value, tone }: { label: string; value: string; tone?: "income" | "expense" }) => {
  const theme = useAppTheme();
  const color = tone === "income" ? theme.colors.success : tone === "expense" ? theme.colors.danger : theme.colors.text;
  return (
    <View style={[styles.stat, { backgroundColor: theme.colors.surfaceMuted }]}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="caption" style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  netBlock: {
    minWidth: 92,
    alignItems: "flex-end",
    gap: spacing.xs
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm
  },
  stat: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    padding: spacing.sm,
    justifyContent: "center",
    gap: spacing.xs
  },
  statValue: {
    fontWeight: "900"
  }
});
