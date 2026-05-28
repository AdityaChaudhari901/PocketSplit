import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { spacing } from "@/lib/theme";

interface ChartCardProps {
  title: string;
  rows: { label: string; value: number; colorTone?: "primary" | "success" | "warning" | "danger" }[];
}

export const ChartCard = ({ title, rows }: ChartCardProps) => {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card style={styles.card}>
      <AppText variant="subtitle">{title}</AppText>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.labelRow}>
            <AppText>{row.label}</AppText>
            <AppText muted>{row.value}%</AppText>
          </View>
          <ProgressBar progress={(row.value / max) * 100} tone={row.colorTone ?? "primary"} />
        </View>
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  row: {
    gap: spacing.sm
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  }
});
