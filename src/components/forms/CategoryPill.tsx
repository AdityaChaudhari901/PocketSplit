import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/lib/theme";

interface CategoryPillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const CategoryPill = ({ label, selected, onPress }: CategoryPillProps) => {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceMuted,
          borderColor: selected ? theme.colors.primary : theme.colors.border
        }
      ]}
    >
      <AppText variant="caption" style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  }
});
