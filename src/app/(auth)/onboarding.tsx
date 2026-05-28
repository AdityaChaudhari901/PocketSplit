import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { FeatureOrb } from "@/components/onboarding/FeatureOrb";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { APP_NAME } from "@/lib/constants";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

const FEATURES = [
  {
    icon: "analytics-outline" as const,
    title: "Quiet signals for smarter saving.",
    body: "Practical recommendations that explain what changed and what to do next."
  },
  {
    icon: "pulse" as const,
    title: "Know what is safe to spend today.",
    body: "MoneyPulse blends income, expenses, bills, budgets, and savings goals into one daily number."
  },
  {
    icon: "receipt" as const,
    title: "Receipts, splits, and reports in one place.",
    body: "Scan receipts, split bills fairly, settle shared expenses, and export reports when you need them."
  }
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const markOnboardingSeen = useAppStore((state) => state.markOnboardingSeen);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const activeFeature = FEATURES[activeFeatureIndex] ?? FEATURES[0];

  const openPlans = () => {
    markOnboardingSeen();
    router.push("/(auth)/plans");
  };

  const openLogin = () => {
    markOnboardingSeen();
    router.push("/(auth)/login");
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brand}>
        <AppText variant="title" style={[styles.brandText, { color: theme.colors.primary }]}>
          {APP_NAME}
        </AppText>
      </View>

      <View style={[styles.visualFrame, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <FeatureOrb />
      </View>

      <View style={styles.featureCopy}>
        <View style={styles.headlineRow}>
          <Ionicons name={activeFeature.icon} size={24} color={theme.colors.primary} />
          <AppText variant="title" style={styles.headline}>
            {activeFeature.title}
          </AppText>
        </View>
        <AppText muted style={styles.body}>
          {activeFeature.body}
        </AppText>
      </View>

      <View style={styles.dots}>
        {FEATURES.map((feature, index) => {
          const active = index === activeFeatureIndex;
          return (
            <Pressable
              key={feature.title}
              accessibilityRole="button"
              accessibilityLabel={feature.title}
              accessibilityState={{ selected: active }}
              onPress={() => setActiveFeatureIndex(index)}
              style={[
                styles.dot,
                {
                  width: active ? 34 : 9,
                  backgroundColor: active ? theme.colors.primary : theme.colors.primarySoft
                }
              ]}
            />
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button icon="arrow-forward-circle" onPress={openPlans}>
          Get Started
        </Button>
        <Pressable accessibilityRole="button" onPress={openLogin} style={styles.loginButton}>
          <AppText style={[styles.loginText, { color: theme.colors.primary }]}>Login</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingTop: spacing.xl
  },
  brand: {
    alignItems: "center"
  },
  brandText: {
    textAlign: "center"
  },
  visualFrame: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 430,
    borderWidth: 1,
    borderRadius: 36,
    overflow: "hidden",
    alignSelf: "center"
  },
  featureCopy: {
    alignItems: "center",
    gap: spacing.md
  },
  headlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    maxWidth: 330
  },
  headline: {
    flex: 1,
    textAlign: "center"
  },
  body: {
    maxWidth: 310,
    textAlign: "center"
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm
  },
  dot: {
    height: 9,
    borderRadius: radius.pill
  },
  actions: {
    gap: spacing.lg,
    paddingBottom: spacing.xl
  },
  loginButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  loginText: {
    fontWeight: "700"
  }
});
