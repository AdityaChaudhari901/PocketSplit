import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CategorySelector } from "@/components/categories/CategorySelector";
import { CategoryPill } from "@/components/forms/CategoryPill";
import { SortSelector } from "@/components/search/SortSelector";
import { TagSelector } from "@/components/tags/TagSelector";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { SearchParams, SearchSortBy } from "@/features/search/searchService";
import { currencyScale } from "@/lib/money";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { Category, CurrencyCode, Tag } from "@/types/domain";

interface FilterSheetProps {
  visible: boolean;
  params: SearchParams;
  categories: Category[];
  tags: Tag[];
  currency: CurrencyCode;
  onApply: (params: SearchParams) => void;
  onClearAll: () => void;
  onClose: () => void;
}

interface FilterDraft {
  fromDate: string;
  toDate: string;
  minAmount: string;
  maxAmount: string;
  type?: SearchParams["type"];
  categoryIds: string[];
  tagIds: string[];
  sortBy: SearchSortBy;
}

const minorToMajorInput = (amountMinor: number | undefined, currency: CurrencyCode): string => {
  if (!Number.isSafeInteger(amountMinor)) {
    return "";
  }

  return String((amountMinor ?? 0) / currencyScale(currency));
};

const majorInputToMinor = (value: string, currency: CurrencyCode): number | undefined => {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) {
    return undefined;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return undefined;
  }

  return Math.round(amount * currencyScale(currency));
};

const createDraft = (params: SearchParams, currency: CurrencyCode): FilterDraft => ({
  fromDate: params.fromDate ?? "",
  toDate: params.toDate ?? "",
  minAmount: minorToMajorInput(params.minAmount, currency),
  maxAmount: minorToMajorInput(params.maxAmount, currency),
  type: params.type,
  categoryIds: params.categoryIds ?? [],
  tagIds: params.tagIds ?? [],
  sortBy: params.sortBy ?? "date_desc"
});

export const FilterSheet = ({ visible, params, categories, tags, currency, onApply, onClearAll, onClose }: FilterSheetProps) => {
  const theme = useAppTheme();
  const [draft, setDraft] = useState<FilterDraft>(() => createDraft(params, currency));

  useEffect(() => {
    if (visible) {
      setDraft(createDraft(params, currency));
    }
  }, [currency, params, visible]);

  const apply = () => {
    onApply({
      ...params,
      fromDate: draft.fromDate.trim() || undefined,
      toDate: draft.toDate.trim() || undefined,
      minAmount: majorInputToMinor(draft.minAmount, currency),
      maxAmount: majorInputToMinor(draft.maxAmount, currency),
      type: draft.type,
      categoryIds: draft.categoryIds,
      tagIds: draft.tagIds,
      sortBy: draft.sortBy,
      page: 1
    });
    onClose();
  };

  const clearAll = () => {
    setDraft(createDraft({ sortBy: "date_desc" }, currency));
    onClearAll();
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText variant="title">Filters</AppText>
              <AppText muted>Refine expenses by date, amount, type, category, and tags.</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.pressed : null]}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.grid}>
              <TextField label="From date" placeholder="YYYY-MM-DD" value={draft.fromDate} onChangeText={(fromDate) => setDraft((current) => ({ ...current, fromDate }))} />
              <TextField label="To date" placeholder="YYYY-MM-DD" value={draft.toDate} onChangeText={(toDate) => setDraft((current) => ({ ...current, toDate }))} />
            </View>

            <View style={styles.grid}>
              <TextField
                keyboardType="numeric"
                label="Min amount"
                placeholder="0"
                value={draft.minAmount}
                onChangeText={(minAmount) => setDraft((current) => ({ ...current, minAmount }))}
              />
              <TextField
                keyboardType="numeric"
                label="Max amount"
                placeholder="0"
                value={draft.maxAmount}
                onChangeText={(maxAmount) => setDraft((current) => ({ ...current, maxAmount }))}
              />
            </View>

            <View style={styles.section}>
              <AppText variant="label" muted>
                Type
              </AppText>
              <View style={styles.pills}>
                <CategoryPill label="All" selected={!draft.type} onPress={() => setDraft((current) => ({ ...current, type: undefined }))} />
                <CategoryPill label="Income" selected={draft.type === "income"} onPress={() => setDraft((current) => ({ ...current, type: "income" }))} />
                <CategoryPill label="Expense" selected={draft.type === "expense"} onPress={() => setDraft((current) => ({ ...current, type: "expense" }))} />
              </View>
            </View>

            <CategorySelector
              categories={categories}
              selectedCategoryIds={draft.categoryIds}
              mode="multiple"
              onChange={(categoryIds) => setDraft((current) => ({ ...current, categoryIds }))}
            />

            <TagSelector tags={tags} selectedTagIds={draft.tagIds} onChange={(tagIds) => setDraft((current) => ({ ...current, tagIds }))} />

            <SortSelector value={draft.sortBy} onChange={(sortBy) => setDraft((current) => ({ ...current, sortBy }))} />
          </ScrollView>

          <View style={styles.footer}>
            <Button variant="ghost" onPress={clearAll}>
              Clear all
            </Button>
            <Button icon="funnel" onPress={apply}>
              Apply filters
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.42)"
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingTop: spacing.sm,
    overflow: "hidden"
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(148, 163, 184, 0.55)",
    marginBottom: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg
  },
  grid: {
    flexDirection: "row",
    gap: spacing.md
  },
  section: {
    gap: spacing.sm
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.24)"
  },
  pressed: {
    opacity: 0.72
  }
});
