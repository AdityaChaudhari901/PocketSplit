import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/lib/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const TextField = ({ label, error, style, leftIcon, rightIcon, onRightIconPress, ...props }: TextFieldProps) => {
  const theme = useAppTheme();
  return (
    <View style={styles.wrap}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            opacity: props.editable === false ? 0.6 : 1
          }
        ]}
      >
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={theme.colors.subtext} /> : null}
        <TextInput
          {...props}
          placeholderTextColor={theme.colors.subtext}
          style={[
            styles.input,
            {
              color: theme.colors.text
            },
            style
          ]}
        />
        {rightIcon ? (
          <Pressable accessibilityRole="button" onPress={onRightIconPress} hitSlop={10} disabled={!onRightIconPress}>
            <Ionicons name={rightIcon} size={18} color={theme.colors.subtext} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: theme.colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  inputShell: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  input: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 0
  }
});
