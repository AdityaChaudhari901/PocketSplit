import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/lib/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "compact";

interface ButtonProps {
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

export const Button = ({
  children,
  onPress,
  variant = "primary",
  size = "default",
  icon,
  disabled,
  loading,
  accessibilityLabel
}: PropsWithChildren<ButtonProps>) => {
  const theme = useAppTheme();
  const backgroundColor =
    variant === "primary"
      ? theme.colors.primary
      : variant === "danger"
        ? theme.colors.danger
        : variant === "secondary"
          ? theme.colors.primarySoft
          : "transparent";
  const foregroundColor = variant === "primary" ? theme.colors.onPrimary : variant === "danger" ? theme.colors.onDanger : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
          borderColor: variant === "ghost" ? theme.colors.border : "transparent"
        },
        size === "compact" ? styles.compactButton : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === "compact" ? 16 : 18} color={foregroundColor} /> : null}
          <AppText variant={size === "compact" ? "caption" : "body"} style={[styles.text, { color: foregroundColor }]}>
            {children}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1
  },
  compactButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  text: {
    fontWeight: "800"
  }
});
