import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FREE_PLAN, PAID_PLAN_TIERS, getPlanOption, type BillingPeriod } from "@/features/subscriptions/plans";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { PLAN_LIMITS } from "@/services/entitlement.service";
import { useAppStore } from "@/store/app.store";

export default function PlansScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const markOnboardingSeen = useAppStore((state) => state.markOnboardingSeen);
  const selectFreePlan = useAppStore((state) => state.selectFreePlan);

  const continueWithFreePlan = () => {
    markOnboardingSeen();
    selectFreePlan();
    router.push("/(auth)/signup");
  };

  const showBillingNotice = (label: string) => {
    Alert.alert("Billing not connected", `${label} requires StoreKit, Google Play Billing, or RevenueCat before activation. Continue with Free for now.`);
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to onboarding" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="hero">Choose your plan</AppText>
          <AppText muted>Three tiers. Pro and Premium can be billed monthly or yearly.</AppText>
        </View>
      </View>

      <Card style={styles.plan}>
        <View style={styles.planHeader}>
          <View style={styles.planTitle}>
            <View style={[styles.icon, { backgroundColor: theme.colors.successSoft }]}>
              <Ionicons name="leaf" size={18} color={theme.colors.success} />
            </View>
            <View style={styles.planCopy}>
              <AppText variant="subtitle">{FREE_PLAN.title}</AppText>
              <AppText variant="title">₹0</AppText>
            </View>
          </View>
          <StatusBadge label={FREE_PLAN.badge} tone="success" />
        </View>
        <AppText muted>{FREE_PLAN.body}</AppText>
        <AppText variant="caption" muted>
          Includes {PLAN_LIMITS.free.features.length} capabilities.
        </AppText>
        <Button icon="checkmark-circle" onPress={continueWithFreePlan}>
          Continue Free
        </Button>
      </Card>

      <View style={[styles.billingSwitch, { backgroundColor: theme.colors.surfaceMuted }]}>
        {(["monthly", "yearly"] as const).map((period) => {
          const active = billingPeriod === period;
          return (
            <Pressable
              key={period}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setBillingPeriod(period)}
              style={[styles.billingOption, active ? { backgroundColor: theme.colors.surface } : null]}
            >
              <AppText style={[styles.billingText, { color: active ? theme.colors.text : theme.colors.subtext }]}>
                {period === "monthly" ? "Monthly" : "Yearly"}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {PAID_PLAN_TIERS.map((tier) => {
        const option = getPlanOption(tier, billingPeriod);
        if (!option) {
          return null;
        }

        return (
          <Card
            key={tier.tierId}
            style={[
              styles.plan,
              tier.featured
                ? {
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.primarySoft
                  }
                : null
            ]}
          >
            <View style={styles.planHeader}>
              <View style={styles.planTitle}>
                <View style={[styles.icon, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name={tier.tierId === "premium" ? "diamond" : "trending-up-outline"} size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.planCopy}>
                  <AppText variant="subtitle">{tier.title}</AppText>
                  <View style={styles.priceRow}>
                    <AppText variant="title">{option.price}</AppText>
                    <AppText variant="caption" muted>
                      {option.billingLabel}
                    </AppText>
                  </View>
                </View>
              </View>
              <StatusBadge label={option.savingsLabel ?? tier.badge} tone={tier.featured ? "ai" : "neutral"} />
            </View>

            <AppText muted>{tier.body}</AppText>
            <AppText variant="caption" muted>
              Includes {PLAN_LIMITS[option.id].features.length} capabilities.
            </AppText>

            <Button variant="secondary" icon="lock-closed" onPress={() => showBillingNotice(`${tier.title} ${billingPeriod}`)}>
              Billing required
            </Button>
          </Card>
        );
      })}

      <Pressable accessibilityRole="button" onPress={() => router.push("/(auth)/login")} style={styles.loginButton}>
        <AppText style={[styles.loginText, { color: theme.colors.primary }]}>Already have an account? Login</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg
  },
  header: {
    gap: spacing.md
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  headerCopy: {
    gap: spacing.sm
  },
  plan: {
    gap: spacing.md
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  planTitle: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md
  },
  planCopy: {
    flex: 1
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  billingSwitch: {
    flexDirection: "row",
    borderRadius: radius.pill,
    padding: spacing.xs,
    gap: spacing.xs
  },
  billingOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  billingText: {
    fontWeight: "800"
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
