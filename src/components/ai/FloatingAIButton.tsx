import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/lib/theme";

interface FloatingAIButtonProps {
  onPress?: () => void;
}

export const FloatingAIButton = ({ onPress }: FloatingAIButtonProps) => {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ask AI"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          opacity: pressed ? 0.84 : 1
        }
      ]}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.onPrimary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 18,
    bottom: 26,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8
  }
});
