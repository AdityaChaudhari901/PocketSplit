import type { PropsWithChildren } from "react";
import { Text, type TextProps, StyleSheet } from "react-native";

import { useAppTheme } from "@/lib/theme";

type Variant = "hero" | "title" | "subtitle" | "body" | "caption" | "label";

interface AppTextProps extends TextProps {
  variant?: Variant;
  muted?: boolean;
}

export const AppText = ({ children, variant = "body", muted, style, ...props }: PropsWithChildren<AppTextProps>) => {
  const theme = useAppTheme();
  return (
    <Text
      {...props}
      style={[
        styles[variant],
        {
          color: muted ? theme.colors.subtext : theme.colors.text
        },
        style
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  hero: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: 0
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: 0
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: 0
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    letterSpacing: 0
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    letterSpacing: 0
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  }
});
