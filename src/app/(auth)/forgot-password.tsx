import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { radius, spacing, useAppTheme } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [email, setEmail] = useState("");

  const requestReset = () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Enter the email address linked to your account.");
      return;
    }

    Alert.alert("Reset link ready", "Connect Supabase password recovery to send reset links from production.");
  };

  return (
    <Screen contentStyle={styles.screen}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to login" onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </Pressable>

      <Card style={styles.authCard}>
        <View style={styles.centerBlock}>
          <View style={[styles.illustration, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="key-outline" size={44} color={theme.colors.primary} />
          </View>
          <View style={styles.copy}>
            <AppText variant="title" style={styles.centerText}>
              Forgot password?
            </AppText>
            <AppText muted style={styles.centerText}>
              Enter your email and we will prepare the reset flow.
            </AppText>
          </View>
        </View>

        <TextField label="E-mail Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" leftIcon="mail-outline" />
        <Button onPress={requestReset}>Get reset link</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  authCard: {
    gap: spacing.lg,
    borderRadius: 28
  },
  centerBlock: {
    alignItems: "center",
    gap: spacing.lg
  },
  illustration: {
    width: 124,
    height: 124,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    gap: spacing.sm
  },
  centerText: {
    textAlign: "center"
  }
});
