import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { spacing, useAppTheme } from "@/lib/theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon, title, body, actionLabel, onAction }: EmptyStateProps) => {
  const theme = useAppTheme();
  return (
    <Card>
      <View style={styles.content}>
        <Ionicons name={icon} size={28} color={theme.colors.primary} />
        <View style={styles.copy}>
          <AppText variant="subtitle">{title}</AppText>
          <AppText muted>{body}</AppText>
        </View>
        {actionLabel ? <Button onPress={onAction}>{actionLabel}</Button> : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md
  },
  copy: {
    gap: spacing.xs
  }
});
