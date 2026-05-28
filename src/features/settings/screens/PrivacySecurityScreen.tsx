import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { useAppStore } from "@/store/app.store";

export const PrivacySecurityScreen = () => {
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const { authenticate, setBiometricEnabled } = useBiometricLock();
  const [enabled, setEnabled] = useState(profile.biometricEnabled);

  const toggle = async (value: boolean) => {
    if (value) {
      const ok = await authenticate();
      if (!ok) {
        Alert.alert("Biometric unavailable", "Set up Face ID, Touch ID, or device biometrics first.");
        return;
      }
    }
    await setBiometricEnabled(value);
    setEnabled(value);
    setProfile({ ...profile, biometricEnabled: value, updatedAt: new Date().toISOString() });
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Privacy & Security</AppText>
        <AppText muted>Protect local access, export data, and keep AI/provider secrets server-side.</AppText>
      </View>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="subtitle">Biometric app lock</AppText>
            <AppText muted>Requires local authentication before unlocking financial data.</AppText>
          </View>
          <Switch value={enabled} onValueChange={toggle} />
        </View>
        <Button variant="secondary" onPress={authenticate} icon="finger-print">
          Test biometric unlock
        </Button>
      </Card>
      <Card style={styles.card}>
        <AppText variant="subtitle">Privacy controls</AppText>
        <AppText muted>AI requests go through Supabase Edge Functions. API keys, OCR keys, and payment provider secrets must never ship in the mobile app.</AppText>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  copy: {
    flex: 1
  }
});
