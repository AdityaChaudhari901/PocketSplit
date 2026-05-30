import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { TagPill } from "@/components/tags/TagPill";
import { AppText } from "@/components/ui/AppText";
import { formatMoney } from "@/lib/money";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { Category, Tag, Transaction } from "@/types/domain";

interface SearchResultItemProps {
  transaction: Transaction;
  category?: Category;
  tags: Tag[];
  onPress: () => void;
}

export const SearchResultItem = ({ transaction, category, tags, onPress }: SearchResultItemProps) => {
  const theme = useAppTheme();
  const isIncome = transaction.type === "income";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${transaction.merchant || category?.name || "transaction"}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed ? styles.pressed : null
      ]}
    >
      <View style={[styles.icon, { backgroundColor: isIncome ? theme.colors.successSoft : theme.colors.surfaceMuted }]}>
        <Ionicons name={isIncome ? "arrow-down" : "arrow-up"} size={17} color={isIncome ? theme.colors.success : theme.colors.danger} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <AppText variant="body" numberOfLines={1}>
              {transaction.merchant || transaction.note || category?.name || "Transaction"}
            </AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {category?.name ?? "Uncategorized"} • {transaction.occurredAt.slice(0, 10)}
            </AppText>
          </View>
          <AppText variant="body" style={{ color: isIncome ? theme.colors.success : theme.colors.text }}>
            {isIncome ? "+" : "-"}
            {formatMoney(transaction.amountMinor, transaction.currency)}
          </AppText>
        </View>
        {transaction.note ? (
          <AppText variant="caption" muted numberOfLines={2}>
            {transaction.note}
          </AppText>
        ) : null}
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.slice(0, 3).map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
            {tags.length > 3 ? (
              <View style={[styles.morePill, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
                <AppText variant="caption" muted>
                  +{tags.length - 3}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.subtext} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 86,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
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
    minWidth: 0,
    gap: spacing.sm
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  titleCopy: {
    flex: 1,
    minWidth: 0
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  morePill: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  }
});
