import { StyleSheet, View } from "react-native";

import { radius, useAppTheme } from "@/lib/theme";

interface ProgressBarProps {
  progress: number;
  tone?: "primary" | "success" | "warning" | "danger";
}

export const ProgressBar = ({ progress, tone = "primary" }: ProgressBarProps) => {
  const theme = useAppTheme();
  const color = tone === "success" ? theme.colors.success : tone === "warning" ? theme.colors.warning : tone === "danger" ? theme.colors.danger : theme.colors.primary;
  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 9,
    borderRadius: radius.pill,
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill
  }
});
