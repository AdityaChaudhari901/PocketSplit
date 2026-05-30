import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { FilterChips } from "@/components/search/FilterChips";
import { FilterSheet } from "@/components/search/FilterSheet";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResultItem } from "@/components/search/SearchResultItem";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { useFilterState, useSearchExpenses } from "@/features/search/hooks";
import type { SearchParams } from "@/features/search/searchService";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

const PAGE_SIZE = 20;

export const SearchScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const categories = useAppStore((state) => state.categories);
  const tags = useAppStore((state) => state.tags);
  const expenseTags = useAppStore((state) => state.expenseTags);
  const currency = useAppStore((state) => state.profile.currency);
  const [sheetVisible, setSheetVisible] = useState(false);
  const { filters, setFilters, setFilter, clearAllFilters, activeFilterCount } = useFilterState({ limit: PAGE_SIZE });
  const searchQuery = useSearchExpenses(filters);
  const result = searchQuery.data;

  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const tagsByExpenseId = useMemo(() => {
    const map = new Map<string, typeof tags>();
    expenseTags.forEach((item) => {
      const tag = tagsById.get(item.tagId);
      if (!tag) {
        return;
      }
      map.set(item.expenseId, [...(map.get(item.expenseId) ?? []), tag]);
    });
    return map;
  }, [expenseTags, tagsById]);

  const removeFilter = useCallback(
    (key: keyof SearchParams, value?: string) => {
      setFilters((current) => {
        const next = { ...current, page: 1 };
        if (key === "fromDate") {
          delete next.fromDate;
          delete next.toDate;
          return next;
        }
        if (key === "minAmount") {
          delete next.minAmount;
          delete next.maxAmount;
          return next;
        }
        if (key === "categoryIds" && value) {
          next.categoryIds = current.categoryIds?.filter((id) => id !== value);
          return next;
        }
        if (key === "tagIds" && value) {
          next.tagIds = current.tagIds?.filter((id) => id !== value);
          return next;
        }
        delete next[key];
        return next;
      });
    },
    [setFilters]
  );

  const clearEverything = () => {
    clearAllFilters();
  };

  const loadMore = () => {
    setFilter("limit", (filters.limit ?? PAGE_SIZE) + PAGE_SIZE);
  };

  const resultCount = result?.total ?? 0;
  const resultLabel = resultCount === 1 ? "1 result" : `${resultCount} results`;
  const showSkeleton = searchQuery.isLoading || (searchQuery.isFetching && !result);

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed ? styles.pressed : null
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <AppText variant="subtitle">Search</AppText>
          <AppText variant="caption" muted>
            Find expenses by text, date, amount, category, or tag.
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          hitSlop={8}
          onPress={() => setSheetVisible(true)}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: theme.colors.surface, borderColor: activeFilterCount > 0 ? theme.colors.primary : theme.colors.border },
            pressed ? styles.pressed : null
          ]}
        >
          <Ionicons name="funnel-outline" size={21} color={activeFilterCount > 0 ? theme.colors.primary : theme.colors.text} />
          {activeFilterCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <AppText variant="caption" style={[styles.badgeText, { color: theme.colors.onPrimary }]}>
                {activeFilterCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <SearchBar value={filters.query ?? ""} onChangeText={(query) => setFilter("query", query || undefined)} onClear={() => setFilter("query", undefined)} />

      <FilterChips params={filters} categories={categories} tags={tags} currency={currency} onRemove={removeFilter} />

      <View style={styles.resultsHeader}>
        <AppText variant="label" muted>
          {resultLabel}
        </AppText>
        {searchQuery.isFetching ? (
          <View style={styles.fetching}>
            <Ionicons name="sync" size={14} color={theme.colors.subtext} />
            <AppText variant="caption" muted>
              Updating
            </AppText>
          </View>
        ) : null}
      </View>

      {showSkeleton ? (
        <View style={styles.skeletonStack}>
          {[0, 1, 2].map((item) => (
            <Card key={item} elevated={false} style={[styles.skeleton, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]} />
          ))}
        </View>
      ) : (
        <FlatList
          data={result?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SearchResultItem
              transaction={item}
              category={categoriesById.get(item.categoryId)}
              tags={tagsByExpenseId.get(item.id) ?? []}
              onPress={() =>
                router.push({
                  pathname: "/modals/edit-transaction",
                  params: { transactionId: item.id }
                })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No expenses match your search"
              body="Try removing a filter or searching a different merchant or note."
              actionLabel="Clear filters"
              onAction={clearEverything}
            />
          }
          ListFooterComponent={
            result?.hasMore ? (
              <View style={styles.footer}>
                <Button variant="secondary" icon="chevron-down" onPress={loadMore} loading={searchQuery.isFetching}>
                  Load more
                </Button>
              </View>
            ) : null
          }
        />
      )}

      <FilterSheet
        visible={sheetVisible}
        params={filters}
        categories={categories}
        tags={tags}
        currency={currency}
        onApply={setFilters}
        onClearAll={clearEverything}
        onClose={() => setSheetVisible(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    paddingTop: spacing.sm,
    gap: spacing.md
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  headerButton: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    flex: 1,
    minWidth: 0
  },
  badge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900"
  },
  resultsHeader: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  fetching: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl
  },
  skeletonStack: {
    gap: spacing.md
  },
  skeleton: {
    minHeight: 86,
    borderWidth: 1,
    opacity: 0.76
  },
  footer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg
  },
  pressed: {
    opacity: 0.72
  }
});
