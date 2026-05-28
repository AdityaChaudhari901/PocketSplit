import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { TransactionRow } from "@/components/cards/TransactionRow";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme, type AppTheme } from "@/lib/theme";
import type { UpcomingBill } from "@/services/recurring-bill.service";
import { selectBudgetUsage, useAppStore } from "@/store/app.store";

type InsightTone = "success" | "warning" | "danger" | "neutral" | "ai";

interface HomeInsight {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  meta: string;
  badge: string;
  tone: InsightTone;
}

type Translate = ReturnType<typeof useTranslation>["t"];

const RECENT_ACTIVITY_PREVIEW_LIMIT = 3;
const RECENT_ACTIVITY_PAGE_SIZE = 5;

const dueCopy = (daysUntilDue: number, t: Translate): string => {
  if (daysUntilDue < 0) {
    return t("home.dueOverdue", { count: Math.abs(daysUntilDue) });
  }

  if (daysUntilDue === 0) {
    return t("home.dueToday");
  }

  if (daysUntilDue === 1) {
    return t("home.dueTomorrow");
  }

  return t("home.dueInDays", { count: daysUntilDue });
};

export const HomeDashboardScreen = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const state = useAppStore();
  const [activityLimit, setActivityLimit] = useState(RECENT_ACTIVITY_PREVIEW_LIMIT);
  const snapshot = state.getDashboardSnapshot();
  const budgets = selectBudgetUsage(state);
  const upcomingBills = state.getUpcomingBills(30);
  const allRecentTransactions = useMemo(() => state.transactions.filter((transaction) => !transaction.deletedAt), [state.transactions]);
  const recentTransactions = allRecentTransactions.slice(0, activityLimit);
  const visibleActivityCount = recentTransactions.length;
  const totalActivityCount = allRecentTransactions.length;
  const hiddenActivityCount = Math.max(0, totalActivityCount - visibleActivityCount);
  const hasCollapsedActivity = totalActivityCount > RECENT_ACTIVITY_PREVIEW_LIMIT;
  const activityMeta =
    hasCollapsedActivity && hiddenActivityCount > 0
      ? t("home.activityVisibleCount", { visible: visibleActivityCount, total: totalActivityCount })
      : t("home.latestCount", { count: visibleActivityCount });
  const activityActionLabel =
    hiddenActivityCount > 0
      ? t("home.viewMoreTransactions", { count: Math.min(RECENT_ACTIVITY_PAGE_SIZE, hiddenActivityCount) })
      : hasCollapsedActivity
        ? t("home.showLessTransactions")
        : null;
  const highestBudgetUsage = budgets.reduce<(typeof budgets)[number] | null>(
    (current, item) => (!current || item.usage.percentage > current.usage.percentage ? item : current),
    null
  );
  const activeGoal = state.savingsGoals.find((goal) => goal.status === "active");
  const goalProgress = activeGoal ? Math.round((activeGoal.savedAmountMinor / activeGoal.targetAmountMinor) * 100) : null;
  const profileInitial = state.profile.displayName.trim().charAt(0).toUpperCase() || "M";
  const spendDeltaMinor = snapshot.allocatedSpendMinor - snapshot.committedSpendMinor;
  const fullRailCardWidth = Math.max(260, width - spacing.lg * 2);
  const insightItems: HomeInsight[] = [
    !snapshot.hasSpendAllocation
      ? {
          id: "allocation",
          icon: "calculator",
          title: t("home.insight.setSpendLimit.title"),
          body: t("home.insight.setSpendLimit.body"),
          meta: formatMoney(snapshot.incomeMinor, state.profile.currency),
          badge: t("home.badge.plan"),
          tone: "ai"
        }
      : highestBudgetUsage
        ? {
            id: "budget",
            icon: highestBudgetUsage.usage.status === "over" ? "alert-circle" : "speedometer",
            title:
              highestBudgetUsage.usage.status === "over"
                ? t("home.insight.budgetOver.title")
                : highestBudgetUsage.usage.status === "watch"
                  ? t("home.insight.budgetWatch.title")
                  : t("home.insight.budgetSafe.title"),
            body: t("home.insight.budget.body", {
              category: state.categories.find((category) => category.id === highestBudgetUsage.budget.categoryId)?.name ?? t("home.insight.topCategory"),
              percentage: highestBudgetUsage.usage.percentage
            }),
            meta: formatMoney(Math.max(0, highestBudgetUsage.usage.remainingMinor), highestBudgetUsage.budget.currency),
            badge:
              highestBudgetUsage.usage.status === "over"
                ? t("home.badge.overBudget")
                : highestBudgetUsage.usage.status === "watch"
                  ? t("common.watch")
                  : t("common.onTrack"),
            tone: highestBudgetUsage.usage.status === "over" ? "danger" : highestBudgetUsage.usage.status === "watch" ? "warning" : "success"
          }
        : {
            id: "budget",
            icon: "wallet",
            title: t("home.insight.noBudget.title"),
            body: t("home.insight.noBudget.body"),
            meta: t("home.insight.noBudget.meta"),
            badge: t("home.badge.insight"),
            tone: "neutral"
          },
    activeGoal
      ? {
          id: "goal",
          icon: "flag",
          title: t("home.insight.goalProgress.title", { name: activeGoal.name, percentage: goalProgress ?? 0 }),
          body: t("home.insight.goalProgress.body", { amount: formatMoney(snapshot.savingsReserveMinor, activeGoal.currency) }),
          meta: formatMoney(Math.max(0, activeGoal.targetAmountMinor - activeGoal.savedAmountMinor), activeGoal.currency),
          badge: goalProgress !== null && goalProgress >= 75 ? t("common.close") : t("common.keepSaving"),
          tone: goalProgress !== null && goalProgress >= 75 ? "success" : "ai"
        }
      : {
          id: "goal",
          icon: "flag",
          title: t("home.insight.noGoal.title"),
          body: t("home.insight.noGoal.body"),
          meta: t("home.insight.noGoal.meta"),
          badge: t("common.optional"),
          tone: "neutral"
        },
    {
      id: "cash-flow",
      icon: spendDeltaMinor >= 0 ? "trending-up" : "trending-down",
      title: spendDeltaMinor >= 0 ? t("home.insight.cashFlowPositive.title") : t("home.insight.cashFlowNegative.title"),
      body: spendDeltaMinor >= 0 ? t("home.insight.cashFlowPositive.body") : t("home.insight.cashFlowNegative.body"),
      meta: formatMoney(Math.abs(spendDeltaMinor), state.profile.currency),
      badge: spendDeltaMinor >= 0 ? t("common.onTrack") : t("common.over"),
      tone: spendDeltaMinor >= 0 ? "success" : "danger"
    }
  ];

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">{t("home.greeting", { name: state.profile.displayName })}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.openSettings")}
          hitSlop={8}
          onPress={() => router.push("/modals/settings")}
          style={({ pressed }) => [
            styles.settingsButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
            pressed ? styles.settingsButtonPressed : null
          ]}
        >
          <AppText style={[styles.settingsInitial, { color: theme.colors.text }]}>{profileInitial}</AppText>
        </Pressable>
      </View>

      <Card style={[styles.overviewCard, { borderColor: theme.colors.primarySoft }]}>
        <View style={styles.overviewHeader}>
          <View>
            <AppText variant="label" muted>
              {t("home.moneyOverview")}
            </AppText>
            <AppText variant="title">{t("home.monthlyPlan")}</AppText>
          </View>
          <View style={styles.overviewActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.setMonthlySpendAllocation")}
              onPress={() => router.push("/modals/monthly-plan")}
              style={({ pressed }) => [styles.setPlanButton, { backgroundColor: theme.colors.primarySoft }, pressed ? styles.setPlanButtonPressed : null]}
            >
              <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
              <AppText variant="caption" style={[styles.setPlanText, { color: theme.colors.primary }]}>
                {t("home.setPlan")}
              </AppText>
            </Pressable>
          </View>
        </View>
        <View style={styles.overviewGrid}>
          <MetricTile label={t("home.monthlySalary")} value={formatMoney(snapshot.incomeMinor, state.profile.currency)} tone="neutral" />
          <MetricTile label={t("home.canSpend")} value={formatMoney(snapshot.spendRemainingMinor, state.profile.currency)} tone={snapshot.overspendMinor > 0 ? "danger" : "success"} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.editMonthlySpendAllocation")}
          onPress={() => router.push("/modals/monthly-plan")}
          style={({ pressed }) => [styles.planSummary, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.planSummaryPressed : null]}
        >
          <AppText variant="caption" muted>
            {t("home.allocation", { amount: formatMoney(snapshot.allocatedSpendMinor, state.profile.currency) })}
          </AppText>
          <View style={[styles.planDivider, { backgroundColor: theme.colors.border }]} />
          <AppText variant="caption" muted>
            {t("home.plannedSavings", { amount: formatMoney(snapshot.plannedSavingsMinor, state.profile.currency) })}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.subtext} />
        </Pressable>
      </Card>

      <View style={styles.horizontalSection}>
        <ActionSectionHeader title={t("home.upcomingBills")} actionLabel={t("home.seeAll")} onAction={() => router.push("/modals/recurring-bills")} />
        {upcomingBills.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
            {upcomingBills.slice(0, 3).map((item) => (
              <BillCard key={item.bill.id} item={item} onPress={() => router.push("/modals/recurring-bills")} />
            ))}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
            <Card elevated={false} style={styles.emptyHorizontalCard}>
              <Ionicons name="calendar-outline" size={22} color={theme.colors.subtext} />
              <AppText muted>{t("home.noBills")}</AppText>
            </Card>
          </ScrollView>
        )}
      </View>

      <View style={styles.horizontalSection}>
        <ActionSectionHeader title={t("home.insights")} actionLabel={t("home.viewAll")} onAction={() => router.push("/(tabs)/ai")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>
          {insightItems.map((insight, index) => (
            <Pressable
              key={insight.id}
              accessibilityRole={insight.id === "allocation" ? "button" : undefined}
              accessibilityLabel={insight.id === "allocation" ? t("home.insight.setSpendLimit.title") : undefined}
              disabled={insight.id !== "allocation"}
              onPress={() => router.push("/modals/monthly-plan")}
              style={({ pressed }) => (pressed ? styles.insightPressed : null)}
            >
              <InsightCard insight={insight} index={index + 1} width={fullRailCardWidth} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Card elevated={false} style={styles.activityCard}>
        <SectionHeader title={t("home.recentActivity")} meta={activityMeta} />
        {recentTransactions.length > 0 ? (
          <>
            <View style={styles.compactList}>
              {recentTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  category={state.categories.find((category) => category.id === transaction.categoryId)}
                  onPress={() =>
                    router.push({
                      pathname: "/modals/edit-transaction",
                      params: { transactionId: transaction.id }
                    })
                  }
                />
              ))}
            </View>
            {activityActionLabel ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={activityActionLabel}
                onPress={() =>
                  setActivityLimit((currentLimit) =>
                    hiddenActivityCount > 0 ? Math.min(currentLimit + RECENT_ACTIVITY_PAGE_SIZE, totalActivityCount) : RECENT_ACTIVITY_PREVIEW_LIMIT
                  )
                }
                style={({ pressed }) => [
                  styles.activityFooterButton,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted },
                  pressed ? styles.activityFooterButtonPressed : null
                ]}
              >
                <AppText variant="caption" style={[styles.activityFooterText, { color: theme.colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {activityActionLabel}
                </AppText>
                <Ionicons name={hiddenActivityCount > 0 ? "chevron-down" : "chevron-up"} size={16} color={theme.colors.primary} />
              </Pressable>
            ) : null}
          </>
        ) : (
          <AppText muted>{t("home.noTransactions")}</AppText>
        )}
      </Card>
    </Screen>
  );
};

const MetricTile = ({ label, value, tone }: { label: string; value: string; tone: "success" | "neutral" | "danger" }) => {
  const theme = useAppTheme();
  const backgroundColor = tone === "success" ? theme.colors.successSoft : tone === "danger" ? theme.colors.dangerSoft : theme.colors.surfaceMuted;
  const borderColor = tone === "success" ? theme.colors.successBorder : tone === "danger" ? theme.colors.dangerBorder : theme.colors.border;
  const valueColor = tone === "success" ? theme.colors.success : tone === "danger" ? theme.colors.danger : theme.colors.text;

  return (
    <View style={[styles.metricTile, { backgroundColor, borderColor }]}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText style={[styles.metricValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
};

const SectionHeader = ({ title, meta }: { title: string; meta: string }) => (
  <View style={styles.compactSectionHeader}>
    <AppText variant="subtitle">{title}</AppText>
    <AppText variant="caption" muted style={styles.sectionMeta}>
      {meta}
    </AppText>
  </View>
);

const ActionSectionHeader = ({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) => {
  const theme = useAppTheme();

  return (
    <View style={styles.actionSectionHeader}>
      <AppText variant="subtitle">{title}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={8} onPress={onAction} style={({ pressed }) => (pressed ? styles.headerActionPressed : null)}>
        <AppText variant="caption" style={[styles.headerActionText, { color: theme.colors.text }]}>
          {actionLabel}
        </AppText>
      </Pressable>
    </View>
  );
};

const BillCard = ({ item, onPress }: { item: UpcomingBill; onPress: () => void }) => {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isUrgent = item.daysUntilDue <= item.bill.remindDaysBefore;
  const tone = item.isOverdue ? "danger" : isUrgent ? "warning" : "neutral";
  const iconColor = item.isOverdue ? theme.colors.danger : isUrgent ? theme.colors.warning : theme.colors.subtext;
  const iconBackgroundColor = item.isOverdue ? theme.colors.dangerSoft : isUrgent ? theme.colors.warningSoft : theme.colors.surfaceMuted;
  const dueLabel = dueCopy(item.daysUntilDue, t);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.bill.name}, ${formatMoney(item.bill.amountMinor, item.bill.currency)}, ${dueLabel}`}
      accessibilityHint={t("home.openBillHint")}
      onPress={onPress}
      style={({ pressed }) => [styles.billPressable, pressed ? styles.billPressed : null]}
    >
      <Card elevated={false} style={styles.billCard}>
        <View style={styles.billTopLine}>
          <View style={[styles.billIcon, { backgroundColor: iconBackgroundColor }]}>
            <Ionicons name="calendar" size={15} color={iconColor} />
          </View>
          <Ionicons name="chevron-forward" size={17} color={theme.colors.subtext} />
        </View>
        <View style={styles.billCopy}>
          <AppText style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.bill.name}
          </AppText>
          <AppText style={[styles.billAmount, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(item.bill.amountMinor, item.bill.currency)}
          </AppText>
          <StatusBadge label={dueLabel} tone={tone} />
        </View>
      </Card>
    </Pressable>
  );
};

const InsightCard = ({ insight, index, width }: { insight: HomeInsight; index: number; width: number }) => {
  const theme = useAppTheme();
  const toneStyle = getInsightToneStyle(theme, insight.tone);

  return (
    <Card elevated={false} style={[styles.insightCard, { width }]}>
      <View style={styles.insightTopLine}>
        <View style={[styles.insightIcon, toneStyle.icon]}>
          <Ionicons name={insight.icon} size={18} color={toneStyle.iconColor} />
        </View>
        <View style={styles.insightBadges}>
          <AppText variant="caption" style={[styles.rankText, { color: theme.colors.subtext }]}>
            #{index}
          </AppText>
          <StatusBadge label={insight.badge} tone={insight.tone} />
        </View>
      </View>
      <AppText variant="subtitle" style={[styles.insightTitle, { color: theme.colors.text }]} numberOfLines={2}>
        {insight.title}
      </AppText>
      <AppText muted style={styles.insightCopy} numberOfLines={3}>
        {insight.body}
      </AppText>
      <AppText variant="caption" style={[styles.insightMeta, { color: toneStyle.iconColor }]} numberOfLines={1}>
        {insight.meta}
      </AppText>
    </Card>
  );
};

const getInsightToneStyle = (theme: AppTheme, tone: InsightTone): { icon: ViewStyle; iconColor: string } => {
  switch (tone) {
    case "success":
      return { icon: { backgroundColor: theme.colors.successSoft }, iconColor: theme.colors.success };
    case "warning":
      return { icon: { backgroundColor: theme.colors.warningSoft }, iconColor: theme.colors.warning };
    case "danger":
      return { icon: { backgroundColor: theme.colors.dangerSoft }, iconColor: theme.colors.danger };
    case "ai":
      return { icon: { backgroundColor: theme.colors.primarySoft }, iconColor: theme.colors.primary };
    case "neutral":
    default:
      return { icon: { backgroundColor: theme.colors.surfaceMuted }, iconColor: theme.colors.subtext };
  }
};

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 140
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#60A5FA",
    backgroundColor: "#F8FBFF"
  },
  settingsButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  settingsInitial: {
    color: "#1F3A5F",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900"
  },
  overviewCard: {
    gap: spacing.md,
    borderColor: "rgba(13, 89, 217, 0.14)"
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  overviewActions: {
    alignItems: "flex-end",
    gap: spacing.sm
  },
  setPlanButton: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#EEF3FF"
  },
  setPlanButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }]
  },
  setPlanText: {
    color: "#0D59D9",
    fontWeight: "900"
  },
  overviewGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  metricTile: {
    flex: 1,
    minHeight: 86,
    borderRadius: 16,
    padding: spacing.md,
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)"
  },
  metricTileSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "rgba(16, 185, 129, 0.14)"
  },
  metricTileDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "rgba(239, 68, 68, 0.14)"
  },
  metricValue: {
    color: "#111827",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900"
  },
  metricValueSuccess: {
    color: "#059669"
  },
  metricValueDanger: {
    color: "#DC2626"
  },
  planSummary: {
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#F8FAFC"
  },
  planSummaryPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  planDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(15, 23, 42, 0.1)"
  },
  duesCard: {
    gap: spacing.md
  },
  activityCard: {
    gap: spacing.md
  },
  horizontalSection: {
    gap: spacing.md
  },
  actionSectionHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  headerActionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }]
  },
  headerActionText: {
    color: "#111827",
    fontWeight: "900"
  },
  horizontalRail: {
    gap: spacing.md,
    paddingRight: spacing.lg
  },
  emptyHorizontalCard: {
    width: 260,
    minHeight: 132,
    gap: spacing.md,
    justifyContent: "center"
  },
  compactSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  sectionMeta: {
    fontWeight: "800",
    textAlign: "right"
  },
  compactList: {
    gap: spacing.sm
  },
  activityFooterButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  activityFooterButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  activityFooterText: {
    maxWidth: "88%",
    fontWeight: "900",
    textAlign: "center"
  },
  billPressable: {
    width: 178
  },
  billPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }]
  },
  billCard: {
    minHeight: 132,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  billTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  billIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9"
  },
  dueIconWarning: {
    backgroundColor: "#FEF3C7"
  },
  dueIconDanger: {
    backgroundColor: "#FEE2E2"
  },
  billCopy: {
    gap: spacing.sm
  },
  rowTitle: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800"
  },
  billAmount: {
    color: "#111827",
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    letterSpacing: 0
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md
  },
  insightList: {
    gap: spacing.md
  },
  insightPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  },
  insightCard: {
    minHeight: 178,
    padding: spacing.md,
    gap: spacing.md
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  insightTopLine: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  insightBadges: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm
  },
  rankText: {
    color: "#94A3B8",
    fontWeight: "900"
  },
  insightTitle: {
    fontSize: 16,
    lineHeight: 21,
    flexShrink: 1
  },
  insightCopy: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1
  },
  insightMeta: {
    fontWeight: "900"
  }
});
