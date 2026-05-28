import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { radius, spacing, useAppTheme } from "@/lib/theme";

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export const Card = ({ children, elevated = true, style, ...props }: PropsWithChildren<CardProps>) => {
  const theme = useAppTheme();
  const backgroundColor = elevated && theme.mode === "dark" ? theme.colors.surfaceRaised : theme.colors.surface;

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow
        },
        elevated ? styles.elevated : null,
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  elevated: {
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4
  }
});
