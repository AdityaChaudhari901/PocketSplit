import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { radius, spacing, useAppTheme } from "@/lib/theme";

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
}

export const SearchBar = ({ value, onChangeText, onClear }: SearchBarProps) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.shell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Ionicons name="search" size={20} color={theme.colors.subtext} />
      <TextInput
        accessibilityLabel="Search expenses"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Search merchant or note"
        placeholderTextColor={theme.colors.subtext}
        returnKeyType="search"
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, { color: theme.colors.text }]}
      />
      {value.trim() ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={onClear}>
          <Ionicons name="close-circle" size={20} color={theme.colors.subtext} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  input: {
    flex: 1,
    minHeight: 50,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 0
  }
});
