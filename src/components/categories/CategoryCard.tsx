import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { isCategoryArchived } from "@/features/categories/categoryService";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { Category } from "@/types/domain";

interface CategoryCardProps {
  category: Category;
  onEdit?: () => void;
  onArchive?: () => void;
}

export const CategoryCard = ({ category, onEdit, onArchive }: CategoryCardProps) => {
  const theme = useAppTheme();
  const archived = isCategoryArchived(category);
  const isDefault = category.isSystem || category.isDefault;

  const confirmArchive = () => {
    if (!onArchive) {
      return;
    }
    Alert.alert("Archive category?", `${category.name} will be hidden from new expenses but remain on existing records.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: onArchive }
    ]);
  };

  return (
    <Card elevated={false} style={[styles.card, archived ? styles.archivedCard : null]}>
      <View style={styles.row}>
        <View style={[styles.colorDot, { backgroundColor: category.color || theme.colors.primarySoft }]}>
          <Ionicons name={(category.icon as keyof typeof Ionicons.glyphMap) || "pricetag"} size={18} color="#FFFFFF" />
        </View>
        <View style={styles.copy}>
          <AppText variant="subtitle" style={archived ? { color: theme.colors.subtext } : undefined}>
            {category.name}
          </AppText>
          <AppText variant="caption" muted>
            {category.kind} category
          </AppText>
        </View>
        {isDefault ? <StatusBadge label="Default" tone="neutral" /> : archived ? <StatusBadge label="Archived" tone="neutral" /> : null}
      </View>
      {!isDefault ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${category.name}`} onPress={onEdit} style={[styles.action, { borderColor: theme.colors.border }]}>
            <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
            <AppText variant="caption" style={{ color: theme.colors.primary }}>
              Edit
            </AppText>
          </Pressable>
          {!archived ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Archive ${category.name}`} onPress={confirmArchive} style={[styles.action, { borderColor: theme.colors.border }]}>
              <Ionicons name="archive-outline" size={16} color={theme.colors.danger} />
              <AppText variant="caption" style={{ color: theme.colors.danger }}>
                Archive
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  archivedCard: {
    opacity: 0.62
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  colorDot: {
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
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  action: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  }
});
