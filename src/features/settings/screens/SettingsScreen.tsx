import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Badge, BadgeText } from "@/components/gluestack/badge";
import { Card as GluestackCard } from "@/components/gluestack/card";
import { HStack } from "@/components/gluestack/hstack";
import { VStack } from "@/components/gluestack/vstack";
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

      <AccountSummaryCard
        displayName={profile.displayName || t("settings.userFallback")}
        email={profile.email || t("settings.notSet")}
        initial={profileInitial(profile.displayName)}
        isPaidPlan={isPaidPlan}
        planName={planLabel(resolvedPlan, t)}
        statusLabel={isPaidPlan ? t("common.active") : t("settings.plan.free")}
      />

      <GluestackCard size="md" variant="outline" className="p-0 overflow-hidden" style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
      </GluestackCard>

      <PlanStatusCard
        activeLabel={t("common.active")}
        inactiveLabel={t("common.inactive")}
        isPaidPlan={isPaidPlan}
        onPress={() => router.push("/modals/paywall")}
        planName={planLabel(resolvedPlan, t)}
        title={t("settings.premiumStatus")}
      />

      <GluestackCard size="md" variant="outline" className="p-0 overflow-hidden" style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <SettingsRow icon="repeat-outline" title={t("settings.recurringBills")} subtitle={t("settings.recurringBills.subtitle")} onPress={() => router.push("/modals/recurring-bills")} />
        <SettingsRow icon="flag-outline" title={t("settings.savingsGoals")} subtitle={t("settings.savingsGoals.subtitle")} onPress={() => router.push("/modals/savings-goals")} />
        <SettingsRow icon="pricetags-outline" title={t("settings.categories")} subtitle={t("settings.categories.subtitle")} onPress={() => router.push("/modals/categories")} />
      </GluestackCard>

      <GluestackCard size="md" variant="outline" className="p-0 overflow-hidden" style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <SettingsRow icon="notifications-outline" title={t("settings.dailyBudgetReminder")} subtitle={t("settings.dailyBudgetReminder.subtitle")} tone="primary" onPress={enableReminder} />
        <SettingsRow icon="download-outline" title={t("settings.dataExport")} subtitle={t("settings.dataExport.subtitle")} onPress={() => router.push("/modals/data-export")} />
        <SettingsRow icon="trash-outline" title={t("settings.deleteAccount")} tone="danger" onPress={() => router.push("/modals/delete-account")} />
      </GluestackCard>

      <GluestackCard size="md" variant="outline" className="gap-4" style={[styles.sessionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <VStack space="xs">
          <AppText variant="caption" muted>
            {t("settings.currentPlan")}
          </AppText>
          <AppText variant="subtitle">{planLabel(resolvedPlan, t)}</AppText>
        </VStack>
        <Button variant="danger" icon="log-out-outline" loading={signingOut} onPress={handleSignOut}>
          {t("settings.signOut")}
        </Button>
      </GluestackCard>
    </Screen>
  );
};

const profileInitial = (displayName: string): string => displayName.trim().charAt(0).toUpperCase() || "M";

const AccountSummaryCard = ({
  displayName,
  email,
  initial,
  isPaidPlan,
  planName,
  statusLabel
}: {
  displayName: string;
  email: string;
  initial: string;
  isPaidPlan: boolean;
  planName: string;
  statusLabel: string;
}) => {
  const theme = useAppTheme();

  return (
    <GluestackCard
      size="lg"
      variant="outline"
      className="gap-4"
      style={[styles.accountCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primaryBorder, shadowColor: theme.colors.shadow }]}
    >
      <HStack style={styles.accountRow}>
        <View style={[styles.accountAvatar, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryBorder }]}>
          <AppText style={[styles.accountAvatarText, { color: theme.colors.primary }]}>{initial}</AppText>
        </View>
        <VStack style={styles.accountCopy} space="xs">
          <AppText variant="title" numberOfLines={1}>
            {displayName}
          </AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {email}
          </AppText>
        </VStack>
      </HStack>
      <HStack style={styles.accountMetaRow}>
        <Badge action={isPaidPlan ? "success" : "muted"} size="sm" variant="solid" style={styles.metaBadge}>
          <BadgeText>{planName}</BadgeText>
        </Badge>
        <Badge action={isPaidPlan ? "success" : "warning"} size="sm" variant="solid" style={styles.metaBadge}>
          <BadgeText>{statusLabel}</BadgeText>
        </Badge>
      </HStack>
    </GluestackCard>
  );
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
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <GluestackCard
        size="md"
        variant="outline"
        style={[styles.subscriptionCard, { backgroundColor: theme.colors.surface, borderColor: isPaidPlan ? theme.colors.successBorder : theme.colors.warningBorder }]}
      >
        <HStack style={styles.subscriptionRow}>
          <View style={[styles.tinyIcon, { backgroundColor: isPaidPlan ? theme.colors.successSoft : theme.colors.warningSoft }]}>
            <Ionicons name="diamond" size={16} color={statusColor} />
          </View>
          <VStack style={styles.subscriptionCopy} space="xs">
            <AppText variant="body">{title}</AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {planName}
            </AppText>
          </VStack>
          <HStack style={styles.subscriptionRight}>
            <AppText variant="body" style={{ color: statusColor }}>
              {isPaidPlan ? activeLabel : inactiveLabel}
            </AppText>
            <Ionicons name="chevron-forward" size={20} color={statusColor} />
          </HStack>
        </HStack>
      </GluestackCard>
    </Pressable>
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
    <HStack style={styles.rowInner}>
      <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <VStack style={styles.rowCopy} space="xs">
        <AppText variant="body" style={tone === "danger" ? { color: theme.colors.danger } : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </VStack>
      {value ? (
        <AppText variant="caption" muted numberOfLines={1} style={styles.rowValue}>
          {value}
        </AppText>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={theme.colors.subtext} /> : null}
    </HStack>
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
    <HStack style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: value ? theme.colors.primarySoft : theme.colors.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={value ? theme.colors.primary : theme.colors.text} />
      </View>
      <VStack style={styles.rowCopy} space="xs">
        <AppText variant="body">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </VStack>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primarySoft }}
        thumbColor={value ? theme.colors.primary : theme.colors.subtext}
      />
    </HStack>
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 0,
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
  rowInner: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
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
  accountCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 2
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  accountAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  accountAvatarText: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  accountCopy: {
    flex: 1,
    minWidth: 0
  },
  accountMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metaBadge: {
    borderRadius: 999,
    minHeight: 28,
    paddingHorizontal: spacing.sm
  },
  subscriptionCard: {
    minHeight: 86,
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.lg
  },
  subscriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  subscriptionCopy: {
    flex: 1,
    minWidth: 0
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
    padding: spacing.lg
  }
});
