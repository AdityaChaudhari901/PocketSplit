import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { formatMoney } from "@/lib/money";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { Category, Tag, Transaction } from "@/types/domain";

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  tags?: Tag[];
  onPress?: () => void;
}

export const TransactionRow = ({ transaction, category, tags = [], onPress }: TransactionRowProps) => {
  const theme = useAppTheme();
  const isIncome = transaction.type === "income";
  const tagLabel = tags.length > 0 ? ` • ${tags.map((tag) => tag.name).join(", ")}` : "";
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: isIncome ? theme.colors.successSoft : theme.colors.surfaceMuted }]}>
        <Ionicons name={isIncome ? "arrow-down" : "arrow-up"} size={16} color={isIncome ? theme.colors.success : theme.colors.danger} />
      </View>
      <View style={styles.copy}>
        <AppText variant="body">{transaction.merchant || category?.name || "Transaction"}</AppText>
        <AppText variant="caption" muted>
          {category?.name ?? "Uncategorized"} • {transaction.occurredAt.slice(0, 10)}
          {tagLabel}
        </AppText>
      </View>
      <AppText variant="body" style={{ color: isIncome ? theme.colors.success : theme.colors.text }}>
        {isIncome ? "+" : "-"}
        {formatMoney(transaction.amountMinor, transaction.currency)}
      </AppText>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.subtext} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${isIncome ? "income" : "expense"} transaction`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowPressed: {
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
    flex: 1
  }
});
