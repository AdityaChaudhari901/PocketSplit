import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { getCurrencyOption } from "@/lib/currencies";
import { useTranslation } from "@/lib/i18n";
import { getAppLanguageDisplayName } from "@/lib/languages";
import { normalizePlanId } from "@/services/entitlement.service";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { signOut } from "@/services/auth.service";
import { getNotificationRuntimeLimitation, scheduleBudgetReminder } from "@/services/notification.service";
import { useAppStore } from "@/store/app.store";
import type { PlanId } from "@/types/domain";

type RowTone = "default" | "primary" | "success" | "warning" | "danger";

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: RowTone;
  onPress?: () => void;
}

interface SettingsSwitchRowProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const planLabel = (planId: PlanId, t: ReturnType<typeof useTranslation>["t"]): string => {
  switch (planId) {
    case "pro_monthly":
      return t("settings.plan.proMonthly");
    case "pro_yearly":
      return t("settings.plan.proYearly");
    case "premium_monthly":
      return t("settings.plan.premiumMonthly");
    case "premium_yearly":
      return t("settings.plan.premiumYearly");
    case "free":
    default:
      return t("settings.plan.free");
  }
};

export const SettingsScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);
  const profile = useAppStore((state) => state.profile);
  const entitlement = useAppStore((state) => state.entitlement);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const appLanguage = useAppStore((state) => state.appLanguage);
  const endSession = useAppStore((state) => state.endSession);
  const resolvedPlan = normalizePlanId(entitlement.planId);
  const isPaidPlan = resolvedPlan !== "free";
  const currencyName = getCurrencyOption(profile.currency)?.name ?? profile.currency;
  const languageName = getAppLanguageDisplayName(appLanguage);
  const darkModeEnabled = theme.mode === "dark";
  const darkModeSubtitle =
    themeMode === "system" ? t("settings.darkMode.system") : darkModeEnabled ? t("settings.darkMode.enabled") : t("settings.darkMode.disabled");

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      endSession();
      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert(t("settings.alert.signOutTitle"), error instanceof Error ? error.message : t("settings.alert.tryAgain"));
    } finally {
      setSigningOut(false);
    }
  };

  const enableReminder = async () => {
    const limitation = getNotificationRuntimeLimitation();
    if (limitation) {
      Alert.alert(t("settings.alert.remindersUnavailable"), limitation);
      return;
    }

    const id = await scheduleBudgetReminder();
    Alert.alert(
      id ? t("settings.alert.reminderScheduled") : t("settings.alert.permissionNeeded"),
      id ? t("settings.alert.dailyReminderEnabled") : t("settings.alert.enableNotifications")
    );
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.goBack")}
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed ? styles.pressed : null
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("settings.title")}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <SettingsRow icon="mail-outline" title={t("settings.email")} value={profile.email || t("settings.notSet")} />
        <SettingsRow icon="person-outline" title={t("settings.username")} value={profile.displayName || t("settings.userFallback")} />
        <SettingsRow icon="cash-outline" title={t("settings.currency")} value={`${profile.currency} - ${currencyName}`} onPress={() => router.push("/modals/currency")} />
        <SettingsRow icon="language-outline" title={t("settings.language")} value={languageName} onPress={() => router.push("/modals/language")} />
        <SettingsSwitchRow
          icon={darkModeEnabled ? "moon" : "sunny-outline"}
          title={t("settings.darkMode")}
          subtitle={darkModeSubtitle}
          value={darkModeEnabled}
          onValueChange={(enabled) => setThemeMode(enabled ? "dark" : "light")}
        />
        <SettingsRow icon="shield-checkmark-outline" title={t("settings.privacy")} onPress={() => router.push("/modals/privacy-security")} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("settings.premiumStatus")}
        onPress={() => router.push("/modals/paywall")}
        style={({ pressed }) => [
          styles.subscriptionCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          pressed ? styles.pressed : null
        ]}
      >
        <View style={styles.subscriptionLeft}>
          <View style={[styles.tinyIcon, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="diamond" size={16} color={theme.colors.primary} />
          </View>
          <AppText variant="body">{t("settings.premiumStatus")}</AppText>
        </View>
        <View style={styles.subscriptionRight}>
          <AppText variant="body" style={{ color: isPaidPlan ? theme.colors.success : theme.colors.warning }}>
            {isPaidPlan ? t("common.active") : t("common.inactive")}
          </AppText>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.warning} />
        </View>
      </Pressable>

      <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <SettingsRow icon="repeat-outline" title={t("settings.recurringBills")} subtitle={t("settings.recurringBills.subtitle")} onPress={() => router.push("/modals/recurring-bills")} />
        <SettingsRow icon="flag-outline" title={t("settings.savingsGoals")} subtitle={t("settings.savingsGoals.subtitle")} onPress={() => router.push("/modals/savings-goals")} />
        <SettingsRow icon="pricetags-outline" title={t("settings.categories")} subtitle={t("settings.categories.subtitle")} onPress={() => router.push("/modals/categories")} />
      </View>

      <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <SettingsRow icon="notifications-outline" title={t("settings.dailyBudgetReminder")} subtitle={t("settings.dailyBudgetReminder.subtitle")} tone="primary" onPress={enableReminder} />
        <SettingsRow icon="download-outline" title={t("settings.dataExport")} subtitle={t("settings.dataExport.subtitle")} onPress={() => router.push("/modals/data-export")} />
        <SettingsRow icon="trash-outline" title={t("settings.deleteAccount")} tone="danger" onPress={() => router.push("/modals/delete-account")} />
      </View>

      <View style={[styles.sessionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View>
          <AppText variant="caption" muted>
            {t("settings.currentPlan")}
          </AppText>
          <AppText variant="subtitle">{planLabel(resolvedPlan, t)}</AppText>
        </View>
        <Button variant="danger" icon="log-out-outline" loading={signingOut} onPress={handleSignOut}>
          {t("settings.signOut")}
        </Button>
      </View>
    </Screen>
  );
};

const SettingsRow = ({ title, subtitle, value, icon, tone = "default", onPress }: SettingsRowProps) => {
  const theme = useAppTheme();
  const iconColor =
    tone === "primary"
      ? theme.colors.primary
      : tone === "success"
        ? theme.colors.success
        : tone === "warning"
          ? theme.colors.warning
          : tone === "danger"
            ? theme.colors.danger
            : theme.colors.text;
  const iconBackground =
    tone === "primary"
      ? theme.colors.primarySoft
      : tone === "success"
        ? theme.colors.successSoft
        : tone === "warning"
          ? theme.colors.warningSoft
          : tone === "danger"
            ? theme.colors.dangerSoft
            : theme.colors.surfaceMuted;

  const rowContent = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <AppText variant="body" style={tone === "danger" ? { color: theme.colors.danger } : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" muted numberOfLines={1} style={styles.rowValue}>
          {value}
        </AppText>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{rowContent}</View>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
      {rowContent}
    </Pressable>
  );
};

const SettingsSwitchRow = ({ title, subtitle, icon, value, onValueChange }: SettingsSwitchRowProps) => {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: value ? theme.colors.primarySoft : theme.colors.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={value ? theme.colors.primary : theme.colors.text} />
      </View>
      <View style={styles.rowCopy}>
        <AppText variant="body">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primarySoft }}
        thumbColor={value ? theme.colors.primary : theme.colors.subtext}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.sm,
    gap: spacing.xl
  },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    flex: 1,
    textAlign: "center"
  },
  headerSpacer: {
    width: 56,
    height: 56
  },
  group: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden"
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  rowCopy: {
    flex: 1,
    minWidth: 0
  },
  rowValue: {
    maxWidth: 150,
    textAlign: "right"
  },
  pressed: {
    opacity: 0.72
  },
  subscriptionCard: {
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  subscriptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  subscriptionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  tinyIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  sessionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.lg
  }
});
