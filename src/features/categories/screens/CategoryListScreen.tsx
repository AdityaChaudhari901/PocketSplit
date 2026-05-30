import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";

import { CategoryCard } from "@/components/categories/CategoryCard";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { useArchiveCategory, useCategories } from "@/features/categories/hooks";
import { spacing } from "@/lib/theme";

export const CategoryListScreen = () => {
  const router = useRouter();
  const [includeArchived, setIncludeArchived] = useState(false);
  const categoriesQuery = useCategories({ includeArchived });
  const archiveCategory = useArchiveCategory();
  const categories = categoriesQuery.data ?? [];

  const customCount = categories.filter((category) => !category.isSystem && !category.isDefault).length;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">Categories</AppText>
          <AppText muted>Keep default labels, add your own, and archive labels without breaking old expenses.</AppText>
        </View>
        <Button icon="add-circle" onPress={() => router.push("/(tabs)/categories/new")}>
          Add
        </Button>
      </View>

      <Card elevated={false} style={styles.toggleCard}>
        <View style={styles.toggleCopy}>
          <AppText variant="subtitle">View archived</AppText>
          <AppText muted>{customCount} custom categories in this view.</AppText>
        </View>
        <Switch value={includeArchived} onValueChange={setIncludeArchived} />
      </Card>

      {categoriesQuery.isLoading ? (
        <Card>
          <AppText muted>Loading categories...</AppText>
        </Card>
      ) : categories.length === 0 ? (
        <EmptyState icon="pricetags-outline" title="No categories yet" body="Create a category to organize expense and income records." actionLabel="Create category" onAction={() => router.push("/(tabs)/categories/new")} />
      ) : (
        categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={() => router.push(`/(tabs)/categories/${category.id}/edit`)}
            onArchive={() =>
              archiveCategory.mutate(category.id, {
                onError: (error) => Alert.alert("Unable to archive category", error instanceof Error ? error.message : "Please try again.")
              })
            }
          />
        ))
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1
  },
  toggleCard: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  toggleCopy: {
    flex: 1
  }
});
