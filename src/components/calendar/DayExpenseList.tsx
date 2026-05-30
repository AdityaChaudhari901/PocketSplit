import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { Category, Transaction } from "@/types/domain";

interface DayExpenseListProps {
  transactions: Transaction[];
  categories: Category[];
  loading?: boolean;
  onPressTransaction: (transaction: Transaction) => void;
}

const iconName = (category?: Category): keyof typeof Ionicons.glyphMap => {
  const value = category?.icon;
  if (value && value in Ionicons.glyphMap) {
    return value as keyof typeof Ionicons.glyphMap;
  }
  return category?.kind === "income" ? "cash-outline" : "receipt-outline";
};

export const DayExpenseList = ({ transactions, categories, loading, onPressTransaction }: DayExpenseListProps) => {
  const theme = useAppTheme();

  if (loading) {
    return (
      <Card elevated={false} style={styles.loadingCard}>
        <ActivityIndicator color={theme.colors.primary} />
        <AppText muted>Loading day activity...</AppText>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return <EmptyState icon="calendar-clear-outline" title="No expenses on this day" body="Choose another date or add an expense from the Add tab." />;
  }

  return (
    <View style={styles.list}>
      {transactions.map((transaction) => {
        const category = categories.find((item) => item.id === transaction.categoryId);
        const isIncome = transaction.type === "income";
        return (
          <Pressable
            key={transaction.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${transaction.merchant || category?.name || "transaction"}`}
            onPress={() => onPressTransaction(transaction)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              pressed ? styles.pressed : null
            ]}
          >
            <View style={[styles.icon, { backgroundColor: isIncome ? theme.colors.successSoft : theme.colors.surfaceMuted }]}>
              <Ionicons name={iconName(category)} size={18} color={isIncome ? theme.colors.success : theme.colors.danger} />
            </View>
            <View style={styles.copy}>
              <AppText variant="body" numberOfLines={1}>
                {transaction.merchant || category?.name || "Transaction"}
              </AppText>
              <AppText variant="caption" muted numberOfLines={1}>
                {category?.name ?? "Uncategorized"} • {transaction.occurredAt.slice(11, 16) || "All day"}
              </AppText>
            </View>
            <View style={styles.amountBlock}>
              <AppText variant="body" style={{ color: isIncome ? theme.colors.success : theme.colors.text }} numberOfLines={1}>
                {isIncome ? "+" : "-"}
                {formatMoney(transaction.amountMinor, transaction.currency)}
              </AppText>
              <StatusBadge label={isIncome ? "Income" : "Expense"} tone={isIncome ? "success" : "danger"} />
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.subtext} />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingCard: {
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  list: {
    gap: spacing.md
  },
  row: {
    minHeight: 74,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  pressed: {
    opacity: 0.72
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  amountBlock: {
    maxWidth: 124,
    alignItems: "flex-end",
    gap: spacing.xs
  }
});
