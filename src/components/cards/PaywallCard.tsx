import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { spacing, useAppTheme } from "@/lib/theme";

interface PaywallCardProps {
  title: string;
  body: string;
  cta?: string;
  onPress?: () => void;
}

export const PaywallCard = ({ title, body, cta = "View plans", onPress }: PaywallCardProps) => {
  const theme = useAppTheme();
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name="lock-closed" size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.copy}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText muted>{body}</AppText>
      </View>
      <Button onPress={onPress} variant="secondary" icon="card-outline">
        {cta}
      </Button>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    gap: spacing.xs
  }
});
