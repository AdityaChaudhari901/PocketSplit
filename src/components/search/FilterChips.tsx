import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { countActiveSearchFilters, type SearchParams } from "@/features/search/searchService";
import { formatMoney } from "@/lib/money";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { Category, CurrencyCode, Tag } from "@/types/domain";

interface FilterChipsProps {
  params: SearchParams;
  categories: Category[];
  tags: Tag[];
  currency: CurrencyCode;
  onRemove: (key: keyof SearchParams, value?: string) => void;
}

interface ChipItem {
  id: string;
  label: string;
  onPress: () => void;
}

const typeLabel = (type: SearchParams["type"]): string => {
  switch (type) {
    case "income":
      return "Income";
    case "expense":
      return "Expense";
    case "transfer":
      return "Transfer";
    default:
      return "";
  }
};

const amountLabel = (params: SearchParams, currency: CurrencyCode): string | null => {
  const min = Number.isSafeInteger(params.minAmount) ? params.minAmount : undefined;
  const max = Number.isSafeInteger(params.maxAmount) ? params.maxAmount : undefined;
  if (min === undefined && max === undefined) {
    return null;
  }
  if (min !== undefined && max !== undefined) {
    return `${formatMoney(min, currency)} - ${formatMoney(max, currency)}`;
  }
  if (min !== undefined) {
    return `From ${formatMoney(min, currency)}`;
  }
  return `Up to ${formatMoney(max ?? 0, currency)}`;
};

export const FilterChips = memo(({ params, categories, tags, currency, onRemove }: FilterChipsProps) => {
  const theme = useAppTheme();
  const chips = useMemo<ChipItem[]>(() => {
    const items: ChipItem[] = [];
    const trimmedQuery = params.query?.trim();
    if (trimmedQuery) {
      items.push({ id: "query", label: `Search: ${trimmedQuery}`, onPress: () => onRemove("query") });
    }
    if (params.fromDate || params.toDate) {
      items.push({ id: "date", label: `${params.fromDate ?? "Any"} to ${params.toDate ?? "Any"}`, onPress: () => onRemove("fromDate") });
    }
    const resolvedAmountLabel = amountLabel(params, currency);
    if (resolvedAmountLabel) {
      items.push({ id: "amount", label: resolvedAmountLabel, onPress: () => onRemove("minAmount") });
    }
    if (params.type) {
      items.push({ id: "type", label: typeLabel(params.type), onPress: () => onRemove("type") });
    }
    params.categoryIds?.forEach((categoryId) => {
      const category = categories.find((item) => item.id === categoryId);
      items.push({
        id: `category-${categoryId}`,
        label: category?.name ?? "Category",
        onPress: () => onRemove("categoryIds", categoryId)
      });
    });
    params.tagIds?.forEach((tagId) => {
      const tag = tags.find((item) => item.id === tagId);
      items.push({
        id: `tag-${tagId}`,
        label: `#${tag?.name ?? "Tag"}`,
        onPress: () => onRemove("tagIds", tagId)
      });
    });
    if (params.groupId) {
      items.push({ id: "group", label: "Group filter", onPress: () => onRemove("groupId") });
    }
    if (params.memberId) {
      items.push({ id: "member", label: "Member filter", onPress: () => onRemove("memberId") });
    }
    return items;
  }, [categories, currency, onRemove, params, tags]);

  if (countActiveSearchFilters(params) === 0 || chips.length === 0) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {chips.map((chip) => (
        <Pressable
          key={chip.id}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${chip.label} filter`}
          onPress={chip.onPress}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryBorder },
            pressed ? styles.pressed : null
          ]}
        >
          <AppText variant="caption" style={{ color: theme.colors.primary }} numberOfLines={1}>
            {chip.label}
          </AppText>
          <Ionicons name="close" size={14} color={theme.colors.primary} />
        </Pressable>
      ))}
    </ScrollView>
  );
});

FilterChips.displayName = "FilterChips";

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingRight: spacing.lg
  },
  chip: {
    maxWidth: 220,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  pressed: {
    opacity: 0.72
  }
});
