import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import type { Tag } from "@/types/domain";

interface TagPillProps {
  tag: Tag;
  selected?: boolean;
  muted?: boolean;
  onPress?: () => void;
}

export const TagPill = ({ tag, selected, muted, onPress }: TagPillProps) => {
  const theme = useAppTheme();
  const foreground = selected ? theme.colors.onPrimary : theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tag.name}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.primary : tag.color || theme.colors.border,
          opacity: muted ? 0.55 : 1
        }
      ]}
    >
      <View style={[styles.dot, { backgroundColor: tag.color || theme.colors.primary }]} />
      <AppText variant="caption" style={{ color: foreground }}>
        {tag.name}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  }
});
