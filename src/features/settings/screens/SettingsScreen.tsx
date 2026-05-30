import { useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { getCurrencyOption } from "@/lib/currencies";
import { useTranslation } from "@/lib/i18n";
import { getAppLanguageDisplayName } from "@/lib/languages";
import { spacing, useAppTheme } from "@/lib/theme";
import { signOut } from "@/services/auth.service";
import { normalizePlanId } from "@/services/entitlement.service";
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
  valueTone?: RowTone;
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

  const showProfileInfo = (label: string, value: string) => {
    Alert.alert(label, value || t("settings.notSet"));
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.goBack")}
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          <View style={[styles.backButton, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </View>
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("settings.title")}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <SettingsGroup>
        <SettingsRow
          icon="mail-outline"
          title={t("settings.email")}
          subtitle={profile.email || t("settings.notSet")}
          onPress={() => showProfileInfo(t("settings.email"), profile.email)}
        />
        <SettingsRow
          icon="person-outline"
          title={t("settings.username")}
          subtitle={profile.displayName || t("settings.userFallback")}
          onPress={() => showProfileInfo(t("settings.username"), profile.displayName)}
        />
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
      </SettingsGroup>

      <PlanStatusCard
        activeLabel={t("common.active")}
        inactiveLabel={t("common.inactive")}
        isPaidPlan={isPaidPlan}
        onPress={() => router.push("/modals/paywall")}
        planName={planLabel(resolvedPlan, t)}
        title={t("settings.premiumStatus")}
      />

      <SettingsGroup>
        <SettingsRow icon="pricetags-outline" title={t("settings.categories")} onPress={() => router.push("/modals/categories")} />
        <SettingsRow icon="bookmark-outline" title={t("settings.tags")} onPress={() => router.push("/(tabs)/tags")} />
        <SettingsRow icon="download-outline" title={t("settings.dataExport")} onPress={() => router.push("/modals/data-export")} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon="repeat-outline" title={t("settings.recurringBills")} onPress={() => router.push("/modals/recurring-bills")} />
        <SettingsRow icon="flag-outline" title={t("settings.savingsGoals")} onPress={() => router.push("/modals/savings-goals")} />
        <SettingsRow icon="notifications-outline" title={t("settings.dailyBudgetReminder")} tone="primary" onPress={enableReminder} />
        <SettingsRow icon="trash-outline" title={t("settings.deleteAccount")} tone="danger" onPress={() => router.push("/modals/delete-account")} />
      </SettingsGroup>

      <View style={[styles.sessionCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
        <View style={styles.sessionCopy}>
          <AppText variant="caption" muted>
            {t("settings.currentPlan")}
          </AppText>
          <AppText variant="body" numberOfLines={1}>
            {planLabel(resolvedPlan, t)}
          </AppText>
        </View>
        <Button variant="danger" icon="log-out-outline" loading={signingOut} onPress={handleSignOut}>
          {t("settings.signOut")}
        </Button>
      </View>
    </Screen>
  );
};

const SettingsGroup = ({ children }: { children: ReactNode }) => {
  const theme = useAppTheme();

  return <View style={[styles.group, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>{children}</View>;
};

const PlanStatusCard = ({
  activeLabel,
  inactiveLabel,
  isPaidPlan,
  onPress,
  planName,
  title
}: {
  activeLabel: string;
  inactiveLabel: string;
  isPaidPlan: boolean;
  onPress: () => void;
  planName: string;
  title: string;
}) => {
  const theme = useAppTheme();
  const statusColor = isPaidPlan ? theme.colors.success : theme.colors.warning;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${planName}`}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <View style={[styles.subscriptionCard, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
        <View style={styles.subscriptionLeft}>
          <Ionicons name="diamond" size={18} color={theme.colors.primary} />
          <View style={styles.subscriptionCopy}>
            <AppText variant="body">{title}</AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {planName}
            </AppText>
          </View>
        </View>
        <View style={styles.subscriptionRight}>
          <AppText variant="body" style={{ color: statusColor }}>
            {isPaidPlan ? activeLabel : inactiveLabel}
          </AppText>
          <Ionicons name="chevron-forward" size={20} color={statusColor} />
        </View>
      </View>
    </Pressable>
  );
};

const SettingsRow = ({ title, subtitle, value, icon, tone = "default", valueTone = "default", onPress }: SettingsRowProps) => {
  const theme = useAppTheme();
  const hasSubtitle = Boolean(subtitle);
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
  const valueColor =
    valueTone === "primary"
      ? theme.colors.primary
      : valueTone === "success"
        ? theme.colors.success
        : valueTone === "warning"
          ? theme.colors.warning
          : valueTone === "danger"
            ? theme.colors.danger
            : theme.colors.subtext;

  const rowContent = (
    <View style={styles.rowInner}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={iconColor} />
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
        <AppText variant="caption" numberOfLines={1} style={[styles.rowValue, { color: valueColor }]}>
          {value}
        </AppText>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.text} /> : null}
    </View>
  );

  if (!onPress) {
    return <View style={[styles.row, hasSubtitle ? styles.rowWithSubtitle : null]}>{rowContent}</View>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, hasSubtitle ? styles.rowWithSubtitle : null, pressed ? styles.pressed : null]}>
      {rowContent}
    </Pressable>
  );
};

const SettingsSwitchRow = ({ title, subtitle, icon, value, onValueChange }: SettingsSwitchRowProps) => {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.row, styles.rowWithSubtitle, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowInner}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={19} color={value ? theme.colors.primary : theme.colors.text} />
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
    </Pressable>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: 20
  },
  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  headerSpacer: {
    width: 56,
    height: 56
  },
  group: {
    borderRadius: 26,
    paddingVertical: 6,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 2
  },
  row: {
    width: "100%",
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 14
  },
  rowWithSubtitle: {
    minHeight: 74
  },
  rowInner: {
    width: "100%",
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  rowValue: {
    maxWidth: 184,
    textAlign: "right"
  },
  pressed: {
    opacity: 0.72
  },
  subscriptionCard: {
    width: "100%",
    minHeight: 82,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 2
  },
  subscriptionLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  subscriptionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  subscriptionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  sessionCard: {
    borderRadius: 26,
    padding: spacing.lg,
    gap: spacing.lg,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 2
  },
  sessionCopy: {
    gap: spacing.xs
  }
});
