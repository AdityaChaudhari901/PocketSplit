import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/lib/theme";

interface StatusBadgeProps {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "ai";
}

export const StatusBadge = ({ label, tone = "neutral" }: StatusBadgeProps) => {
  const theme = useAppTheme();
  const backgroundColor =
    tone === "success"
      ? theme.colors.successSoft
      : tone === "warning"
        ? theme.colors.warningSoft
        : tone === "danger"
          ? theme.colors.dangerSoft
          : tone === "ai"
            ? theme.colors.primarySoft
            : theme.colors.surfaceMuted;
  const color =
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
        ? theme.colors.warning
        : tone === "danger"
          ? theme.colors.danger
          : tone === "ai"
            ? theme.colors.primary
            : theme.colors.subtext;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <AppText variant="caption" style={[styles.label, { color }]}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  label: {
    fontWeight: "800"
  }
});
