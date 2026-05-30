import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/lib/theme";

interface PeriodSelectorProps {
  year: number;
  month: number;
  onPrevious: () => void;
  onNext: () => void;
}

const labelForPeriod = (year: number, month: number): string =>
  new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));

export const PeriodSelector = ({ year, month, onPrevious, onNext }: PeriodSelectorProps) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        onPress={onPrevious}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.pressed : null]}
      >
        <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
      </Pressable>
      <View style={styles.copy}>
        <AppText variant="label" muted>
          Reporting period
        </AppText>
        <AppText variant="subtitle" numberOfLines={1} adjustsFontSizeToFit>
          {labelForPeriod(year, month)}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next month"
        onPress={onNext}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.pressed : null]}
      >
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: spacing.xs
  },
  pressed: {
    opacity: 0.72
  }
});
