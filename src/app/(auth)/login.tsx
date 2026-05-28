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
import { APP_NAME } from "@/lib/constants";
import { isDemoModeEnabled } from "@/lib/env";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { authSchema, type AuthFormValues } from "@/schemas/auth.schema";
import { signIn, signInDemo } from "@/services/auth.service";
import { useAppStore } from "@/store/app.store";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const completeAuthenticatedSession = useAppStore((state) => state.completeAuthenticatedSession);
  const demoModeEnabled = isDemoModeEnabled();
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
      const result = await signIn(values.email, values.password);
      completeAuthenticatedSession(result.profile, result.mode);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Unable to sign in", error instanceof Error ? error.message : "Please try again.");
    }
  });

  const startDemo = async () => {
    setIsStartingDemo(true);
    try {
      const result = await signInDemo();
      completeAuthenticatedSession(result.profile, result.mode);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Unable to start demo", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsStartingDemo(false);
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to onboarding" onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </Pressable>

      <Card style={styles.authCard}>
        <View style={styles.brandBlock}>
          <View style={[styles.logo, { backgroundColor: theme.colors.text }]}>
            <Ionicons name="pulse-outline" size={22} color={theme.colors.surface} />
          </View>
          <View>
            <AppText variant="title">Login</AppText>
            <AppText muted>Access {APP_NAME} with your Free subscription.</AppText>
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
                autoComplete="password"
                leftIcon="lock-closed-outline"
                rightIcon={passwordVisible ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setPasswordVisible((visible) => !visible)}
                error={errors.password?.message}
              />
            )}
          />

          <View style={styles.formMeta}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }} onPress={() => setRememberMe((value) => !value)} style={styles.rememberRow}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: rememberMe ? theme.colors.primary : theme.colors.border,
                    backgroundColor: rememberMe ? theme.colors.primary : "transparent"
                  }
                ]}
              >
                {rememberMe ? <Ionicons name="checkmark" size={12} color={theme.colors.onPrimary} /> : null}
              </View>
              <AppText variant="caption" muted>
                Remember me
              </AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/forgot-password")}>
              <AppText variant="caption" style={[styles.linkText, { color: theme.colors.text }]}>
                Forgot password?
              </AppText>
            </Pressable>
          </View>

          <Button onPress={onSubmit} loading={isSubmitting}>
            Login
          </Button>
          {demoModeEnabled ? (
            <Button variant="secondary" icon="diamond" onPress={startDemo} loading={isStartingDemo}>
              Try Premium Demo
            </Button>
          ) : null}
        </View>

        <View style={styles.bottomPrompt}>
          <AppText variant="caption" muted>
            Do not have an account?
          </AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/signup")}>
            <AppText variant="caption" style={[styles.linkText, { color: theme.colors.text }]}>
              Sign up
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
  formMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
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
