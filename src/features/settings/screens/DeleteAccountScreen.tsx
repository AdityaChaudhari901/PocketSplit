import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";

export const DeleteAccountScreen = () => (
  <Screen>
    <View>
      <AppText variant="hero">Delete account</AppText>
      <AppText muted>Financial records should be soft-deleted first, with audit logs and export options before irreversible deletion.</AppText>
    </View>
    <Card style={styles.card}>
      <AppText variant="subtitle">Before deletion</AppText>
      <AppText muted>Export your data, settle group balances, and confirm payment proof records. Production deletion should run as a backend job with audit logging.</AppText>
      <Button
        variant="danger"
        icon="trash"
        onPress={() => Alert.alert("Deletion job not connected", "Connect the secure backend delete-account flow before enabling destructive deletion.")}
      >
        Request account deletion
      </Button>
    </Card>
  </Screen>
);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  }
});
