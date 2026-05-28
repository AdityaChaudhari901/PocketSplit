import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { authSchema, type AuthFormValues } from "@/schemas/auth.schema";
import { signUp } from "@/services/auth.service";
import { useAppStore } from "@/store/app.store";

export default function SignupScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const completeAuthenticatedSession = useAppStore((state) => state.completeAuthenticatedSession);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await signUp(values.email, values.password);
      completeAuthenticatedSession(result.profile, result.mode);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Unable to create account", error instanceof Error ? error.message : "Please try again.");
    }
  });

  return (
    <Screen contentStyle={styles.screen}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to login" onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </Pressable>

      <Card style={styles.authCard}>
        <View style={styles.brandBlock}>
          <View style={[styles.logo, { backgroundColor: theme.colors.text }]}>
            <Ionicons name="pulse-outline" size={22} color={theme.colors.surface} />
          </View>
          <View>
            <AppText variant="title">Create account</AppText>
            <AppText muted>Start with Free. Upgrade later when billing is connected.</AppText>
          </View>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="E-mail Address"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                leftIcon="mail-outline"
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange } }) => (
              <TextField
                label="Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry={!passwordVisible}
                autoComplete="new-password"
                leftIcon="lock-closed-outline"
                rightIcon={passwordVisible ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setPasswordVisible((visible) => !visible)}
                error={errors.password?.message}
              />
            )}
          />

          <View style={styles.termsRow}>
            <Ionicons name="shield-checkmark-outline" size={17} color={theme.colors.success} />
            <AppText variant="caption" muted>
              Your provider keys stay server-side through Supabase Edge Functions.
            </AppText>
          </View>

          <Button onPress={onSubmit} loading={isSubmitting}>
            Sign up
          </Button>
        </View>

        <View style={styles.bottomPrompt}>
          <AppText variant="caption" muted>
            Already have an account?
          </AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/login")}>
            <AppText variant="caption" style={[styles.linkText, { color: theme.colors.text }]}>
              Sign in
            </AppText>
          </Pressable>
        </View>
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
  brandBlock: {
    gap: spacing.md
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  form: {
    gap: spacing.md
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  bottomPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs
  },
  linkText: {
    fontWeight: "800"
  }
});
