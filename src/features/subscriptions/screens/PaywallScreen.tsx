import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FREE_PLAN, PAID_PLAN_TIERS, getPlanOption, type BillingPeriod } from "@/features/subscriptions/plans";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { PLAN_LIMITS } from "@/services/entitlement.service";

export const PaywallScreen = () => {
  const theme = useAppTheme();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const showBillingNotice = (label: string) => {
    Alert.alert("Billing not connected", `${label} requires StoreKit, Google Play Billing, or RevenueCat before activation.`);
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Upgrade</AppText>
        <AppText muted>Choose Free, Pro, or Premium. Pro and Premium support monthly and yearly billing.</AppText>
      </View>

      <Card style={styles.plan}>
        <View style={styles.planHeader}>
          <View style={styles.planTitle}>
            <View style={[styles.icon, { backgroundColor: theme.colors.successSoft }]}>
              <Ionicons name="leaf" size={18} color={theme.colors.success} />
            </View>
            <View>
              <AppText variant="subtitle">{FREE_PLAN.title}</AppText>
              <AppText muted>₹0</AppText>
            </View>
          </View>
          <StatusBadge label="Current fallback" tone="neutral" />
        </View>
        <AppText muted>{FREE_PLAN.body}</AppText>
        <AppText variant="caption" muted>
          Includes {PLAN_LIMITS.free.features.length} gated capabilities.
        </AppText>
        <Button variant="ghost" icon="checkmark-circle">
          Included
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
          <Card key={tier.tierId} style={styles.plan}>
            <View style={styles.planHeader}>
              <View style={styles.planTitle}>
                <View style={[styles.icon, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name={tier.tierId === "premium" ? "diamond" : "trending-up-outline"} size={18} color={theme.colors.primary} />
                </View>
                <View>
                  <AppText variant="subtitle">{tier.title}</AppText>
                  <AppText muted>
                    {option.price} {option.billingLabel}
                  </AppText>
                </View>
              </View>
              <StatusBadge label={option.savingsLabel ?? tier.badge} tone={tier.featured ? "ai" : "neutral"} />
            </View>
            <AppText muted>{tier.body}</AppText>
            <AppText variant="caption" muted>
              Includes {PLAN_LIMITS[option.id].features.length} gated capabilities.
            </AppText>
            <Button variant="primary" icon="lock-closed" onPress={() => showBillingNotice(`${tier.title} ${billingPeriod}`)}>
              Connect billing adapter
            </Button>
          </Card>
        );
      })}
    </Screen>
  );
};

const styles = StyleSheet.create({
  plan: {
    gap: spacing.md
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  planTitle: {
    flexDirection: "row",
    gap: spacing.md,
    flex: 1
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
  }
});
