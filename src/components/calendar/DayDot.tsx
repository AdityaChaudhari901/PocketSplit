import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

interface DayDotProps {
  tone: "income" | "expense";
}

export const DayDot = ({ tone }: DayDotProps) => {
  const theme = useAppTheme();
  return <View style={[styles.dot, { backgroundColor: tone === "income" ? theme.colors.success : theme.colors.danger }]} />;
};

const styles = StyleSheet.create({
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5
  }
});
