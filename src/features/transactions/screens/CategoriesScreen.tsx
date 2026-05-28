import { StyleSheet, View } from "react-native";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const CategoriesScreen = () => {
  const categories = useAppStore((state) => state.categories);
  return (
    <Screen>
      <View>
        <AppText variant="hero">Categories</AppText>
        <AppText muted>System categories are available for free. Custom category rules are gated through entitlements.</AppText>
      </View>
      <Card style={styles.card}>
        <AppText variant="subtitle">Expense categories</AppText>
        <View style={styles.pills}>
          {categories
            .filter((category) => category.kind === "expense")
            .map((category) => (
              <CategoryPill key={category.id} label={category.name} />
            ))}
        </View>
      </Card>
      <Card style={styles.card}>
        <AppText variant="subtitle">Income categories</AppText>
        <View style={styles.pills}>
          {categories
            .filter((category) => category.kind === "income")
            .map((category) => (
              <CategoryPill key={category.id} label={category.name} />
            ))}
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
