import { StyleSheet, View } from "react-native";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { isCategoryArchived } from "@/features/categories/categoryService";
import { spacing, useAppTheme } from "@/lib/theme";
import type { Category } from "@/types/domain";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId?: string;
  selectedCategoryIds?: string[];
  onSelect?: (categoryId: string) => void;
  onChange?: (categoryIds: string[]) => void;
  mode?: "single" | "multiple";
  kind?: Category["kind"];
  error?: string;
  includeSelectedArchived?: boolean;
}

export const CategorySelector = ({
  categories,
  selectedCategoryId,
  selectedCategoryIds = [],
  onSelect,
  onChange,
  mode = "single",
  kind,
  error,
  includeSelectedArchived
}: CategorySelectorProps) => {
  const theme = useAppTheme();
  const selected = new Set(mode === "multiple" ? selectedCategoryIds : selectedCategoryId ? [selectedCategoryId] : []);
  const visibleCategories = categories
    .filter((category) => (kind ? category.kind === kind : true))
    .filter((category) => !isCategoryArchived(category) || (includeSelectedArchived && selected.has(category.id)))
    .sort((left, right) => {
      const leftDefault = left.isSystem || left.isDefault;
      const rightDefault = right.isSystem || right.isDefault;
      if (leftDefault !== rightDefault) {
        return leftDefault ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

  return (
    <View style={styles.wrap}>
      <AppText variant="label" muted>
        Category
      </AppText>
      <View style={styles.pills}>
        {visibleCategories.map((category) => (
          <CategoryPill
            key={category.id}
            label={isCategoryArchived(category) ? `${category.name} (archived)` : category.name}
            selected={selected.has(category.id)}
            onPress={() => {
              if (mode === "multiple") {
                onChange?.(selected.has(category.id) ? selectedCategoryIds.filter((id) => id !== category.id) : [...selectedCategoryIds, category.id]);
                return;
              }

              onSelect?.(category.id);
            }}
          />
        ))}
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: theme.colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
