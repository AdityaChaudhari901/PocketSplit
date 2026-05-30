import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { spacing, useAppTheme } from "@/lib/theme";

interface SearchPillProps extends Omit<TextInputProps, "onChangeText" | "style" | "value"> {
  accessibilityLabel: string;
  inputStyle?: StyleProp<TextStyle>;
  label?: string;
  leftBadgeCount?: number;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftIconAccessibilityLabel?: string;
  onChangeText?: (value: string) => void;
  onClear?: () => void;
  onLeftIconPress?: () => void;
  onMicPress?: () => void;
  onPress?: () => void;
  onRightIconPress?: () => void;
  onSearchPress?: () => void;
  placeholder?: string;
  rightBadgeCount?: number;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightIconAccessibilityLabel?: string;
  showMic?: boolean;
  showSearchIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  value?: string;
}

const hitSlop = { top: 10, right: 10, bottom: 10, left: 10 };

export const SearchPill = ({
  accessibilityLabel,
  inputStyle,
  label,
  leftBadgeCount = 0,
  leftIcon,
  leftIconAccessibilityLabel = "Search options",
  onChangeText,
  onClear,
  onLeftIconPress,
  onMicPress,
  onPress,
  onRightIconPress,
  onSearchPress,
  placeholder = "Search..",
  rightBadgeCount = 0,
  rightIcon,
  rightIconAccessibilityLabel = "Search action",
  showMic = true,
  showSearchIcon = true,
  style,
  value = "",
  ...inputProps
}: SearchPillProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const shellBorderColor = focused ? theme.colors.primary : theme.colors.primaryBorder;
  const shellBackground = theme.mode === "dark" ? theme.colors.surfaceRaised : theme.colors.surface;

  const field = (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: shellBackground,
          borderColor: shellBorderColor,
          shadowColor: theme.colors.shadow,
          opacity: inputProps.editable === false ? 0.6 : 1
        },
        style
      ]}
    >
      <View style={[styles.inner, { backgroundColor: shellBackground }]}>
        {leftIcon ? (
          onLeftIconPress ? (
            <Pressable accessibilityRole="button" accessibilityLabel={leftIconAccessibilityLabel} hitSlop={hitSlop} onPress={onLeftIconPress} style={styles.leftIconButton}>
              <Ionicons name={leftIcon} size={19} color={theme.colors.primary} />
              {leftBadgeCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.onDanger }]}>{Math.min(leftBadgeCount, 9)}</Text>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.leftIconButton}>
              <Ionicons name={leftIcon} size={19} color={theme.colors.primary} />
            </View>
          )
        ) : null}

        {onChangeText ? (
          <TextInput
            {...inputProps}
            accessibilityLabel={accessibilityLabel}
            autoCapitalize={inputProps.autoCapitalize ?? "none"}
            autoCorrect={inputProps.autoCorrect ?? false}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.subtext}
            returnKeyType={inputProps.returnKeyType ?? "search"}
            value={value}
            onChangeText={onChangeText}
            onBlur={(event) => {
              setFocused(false);
              inputProps.onBlur?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              inputProps.onFocus?.(event);
            }}
            style={[styles.input, { color: theme.colors.text }, inputStyle]}
          />
        ) : (
          <Text accessibilityLabel={accessibilityLabel} numberOfLines={1} style={[styles.placeholder, { color: hasValue ? theme.colors.text : theme.colors.subtext }, inputStyle]}>
            {hasValue ? value : placeholder}
          </Text>
        )}

        <View style={styles.actions}>
          {hasValue && onClear ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={hitSlop} onPress={onClear} style={styles.iconButton}>
              <Ionicons name="close-circle" size={20} color={theme.colors.subtext} />
            </Pressable>
          ) : null}
          {showMic ? (
            onMicPress ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Voice search" hitSlop={hitSlop} onPress={onMicPress} style={styles.iconButton}>
                <Ionicons name="mic-outline" size={19} color={theme.colors.subtext} />
              </Pressable>
            ) : (
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.iconButton}>
                <Ionicons name="mic-outline" size={19} color={theme.colors.subtext} />
              </View>
            )
          ) : null}
          {rightIcon ? (
            onRightIconPress ? (
              <Pressable accessibilityRole="button" accessibilityLabel={rightIconAccessibilityLabel} hitSlop={hitSlop} onPress={onRightIconPress} style={styles.iconButton}>
                <Ionicons name={rightIcon} size={20} color={theme.colors.primary} />
                {rightBadgeCount > 0 ? (
                  <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.onDanger }]}>{Math.min(rightBadgeCount, 9)}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.iconButton}>
                <Ionicons name={rightIcon} size={20} color={theme.colors.primary} />
              </View>
            )
          ) : showSearchIcon ? (
            onSearchPress ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Search" hitSlop={hitSlop} onPress={onSearchPress} style={styles.iconButton}>
                <Ionicons name="search" size={20} color={theme.colors.primary} />
              </Pressable>
            ) : (
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.iconButton}>
                <Ionicons name="search" size={20} color={theme.colors.primary} />
              </View>
            )
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" muted>
          {label}
        </AppText>
      ) : null}
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
          {field}
        </Pressable>
      ) : (
        field
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm
  },
  shell: {
    width: "100%",
    minHeight: 58,
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 4,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 3
  },
  inner: {
    minHeight: 48,
    borderRadius: 25,
    paddingLeft: 12,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center"
  },
  leftIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs
  },
  badge: {
    position: "absolute",
    top: 1,
    right: 0,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 0
  },
  input: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    paddingVertical: 0
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    letterSpacing: 0
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: spacing.sm
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }]
  }
});
