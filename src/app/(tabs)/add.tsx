import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, useAppTheme } from "@/lib/theme";

const actions = [
  { label: "Add expense", icon: "remove-circle" as const, href: "/modals/add-expense" as const },
  { label: "Add income", icon: "add-circle" as const, href: "/modals/add-income" as const },
  { label: "Scan receipt", icon: "scan" as const, href: "/modals/receipt-scanner" as const },
  { label: "Add split expense", icon: "people" as const, href: "/modals/add-split-expense" as const },
  { label: "Add subscription", icon: "repeat" as const, href: "/modals/paywall" as const }
];

export default function AddHubScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const openAction = (href: (typeof actions)[number]["href"]) => router.push(href);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="hero">Add</AppText>
        <AppText muted>Choose the shortest path. You can always review AI suggestions before saving.</AppText>
      </View>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => openAction(action.href)}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow
              },
              pressed ? styles.actionPressed : null
            ]}
          >
            <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name={action.icon} size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.actionCopy}>
              <AppText variant="subtitle">{action.label}</AppText>
              <AppText variant="caption" muted>
                {action.label === "Scan receipt" ? "Upload image, parse, review, then save." : "Create a clean financial record."}
              </AppText>
            </View>
            <View style={[styles.cta, { backgroundColor: theme.colors.primarySoft }]}>
              <AppText variant="body" style={[styles.ctaText, { color: theme.colors.primary }]}>
                Continue
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm
  },
  grid: {
    gap: spacing.md
  },
  action: {
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4
  },
  actionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  actionCopy: {
    gap: spacing.xs
  },
  cta: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  ctaText: {
    fontWeight: "800"
  }
});
