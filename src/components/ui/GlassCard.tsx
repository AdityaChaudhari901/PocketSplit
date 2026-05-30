import { BlurView, type BlurViewProps } from "expo-blur";
import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import { getGlassColors } from "@/theme/colors";
import { glassShadow, radii, space } from "@/theme/spacing";
import { useAppTheme } from "@/lib/theme";

type GlassCardVariant = "default" | "strong" | "dock";
type GlassCardPadding = "none" | "sm" | "md" | "lg";

interface GlassCardProps extends ViewProps {
  blurIntensity?: number;
  contentStyle?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: GlassCardPadding;
  tint?: BlurViewProps["tint"];
  variant?: GlassCardVariant;
}

const paddingBySize: Record<GlassCardPadding, number> = {
  none: 0,
  sm: space[3],
  md: space[4],
  lg: space[5]
};

export const GlassCard = ({
  blurIntensity,
  children,
  contentStyle,
  elevated = true,
  padding = "md",
  style,
  tint,
  variant = "default",
  ...props
}: PropsWithChildren<GlassCardProps>) => {
  const theme = useAppTheme();
  const glass = getGlassColors(theme.mode);
  const fallbackBackground = variant === "dock" ? glass.dock : variant === "strong" ? glass.cardStrong : glass.card;
  const resolvedTint = tint ?? (theme.mode === "dark" ? "systemMaterialDark" : "systemMaterialLight");
  const resolvedIntensity = blurIntensity ?? (variant === "dock" ? 72 : variant === "strong" ? 58 : 46);

  return (
    <View
      {...props}
      style={[
        styles.shell,
        {
          backgroundColor: fallbackBackground,
          borderColor: variant === "default" ? glass.border : glass.borderStrong,
          shadowColor: glass.shadow
        },
        elevated ? styles.elevated : null,
        style
      ]}
    >
      <BlurView
        intensity={resolvedIntensity}
        tint={resolvedTint}
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.overlay, { backgroundColor: fallbackBackground }]} />
      <View style={[styles.content, { padding: paddingBySize[padding] }, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden"
  },
  elevated: glassShadow,
  overlay: {
    ...StyleSheet.absoluteFillObject
  },
  content: {
    position: "relative"
  }
});
