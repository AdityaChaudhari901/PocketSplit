import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { spacing, useAppTheme } from "@/lib/theme";

interface AIInsightCardProps {
  title: string;
  summary: string;
  riskLevel: "low" | "medium" | "high";
}

export const AIInsightCard = ({ title, summary, riskLevel }: AIInsightCardProps) => {
  const theme = useAppTheme();
  const tone = riskLevel === "high" ? "danger" : riskLevel === "medium" ? "warning" : "success";

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
          <Ionicons name="analytics-outline" size={18} color={theme.colors.primary} />
        </View>
        <StatusBadge label="AI spending insight" tone="ai" />
      </View>
      <View style={styles.copy}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText muted>{summary}</AppText>
      </View>
      <StatusBadge label={`${riskLevel} risk`} tone={tone} />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    gap: spacing.xs
  }
});
