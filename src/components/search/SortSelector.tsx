import { StyleSheet, View } from "react-native";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import type { SearchSortBy } from "@/features/search/searchService";
import { spacing } from "@/lib/theme";

interface SortOption {
  label: string;
  value: SearchSortBy;
}

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest", value: "date_desc" },
  { label: "Oldest", value: "date_asc" },
  { label: "Highest", value: "amount_desc" },
  { label: "Lowest", value: "amount_asc" }
];

interface SortSelectorProps {
  value: SearchSortBy;
  onChange: (value: SearchSortBy) => void;
}

export const SortSelector = ({ value, onChange }: SortSelectorProps) => (
  <View style={styles.wrap}>
    <AppText variant="label" muted>
      Sort
    </AppText>
    <View style={styles.options}>
      {SORT_OPTIONS.map((option) => (
        <CategoryPill key={option.value} label={option.label} selected={value === option.value} onPress={() => onChange(option.value)} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
