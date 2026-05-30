import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FilterChips } from "@/components/search/FilterChips";
import { FilterSheet } from "@/components/search/FilterSheet";
import { SearchResultItem } from "@/components/search/SearchResultItem";
import { TransactionRow } from "@/components/cards/TransactionRow";
import { Badge as GluestackBadge, BadgeText } from "@/components/gluestack/badge";
import { Card as GluestackCard } from "@/components/gluestack/card";
import { HStack } from "@/components/gluestack/hstack";
import { Progress, ProgressFilledTrack } from "@/components/gluestack/progress";
import { VStack } from "@/components/gluestack/vstack";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { SearchPill } from "@/components/ui/SearchPill";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFilterState, useSearchExpenses } from "@/features/search/hooks";
import type { SearchParams } from "@/features/search/searchService";
import { daysRemainingInMonth } from "@/lib/dates";
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
type DashboardSnapshot = ReturnType<ReturnType<typeof useAppStore.getState>["getDashboardSnapshot"]>;
type AppCurrency = ReturnType<typeof useAppStore.getState>["profile"]["currency"];

const RECENT_ACTIVITY_PREVIEW_LIMIT = 3;
const RECENT_ACTIVITY_PAGE_SIZE = 5;
const HOME_SEARCH_RESULT_LIMIT = 5;

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
  const [safeSpendVisible, setSafeSpendVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const { filters: homeSearchFilters, setFilters: setHomeSearchFilters, setFilter: setHomeSearchFilter, clearAllFilters: clearHomeSearchFilters, activeFilterCount } = useFilterState({
    limit: HOME_SEARCH_RESULT_LIMIT
  });
  const homeSearchQuery = useSearchExpenses(homeSearchFilters);
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
  const daysLeft = daysRemainingInMonth();
  const spendPlanProgress = snapshot.allocatedSpendMinor > 0 ? Math.min(100, Math.round((snapshot.committedSpendMinor / snapshot.allocatedSpendMinor) * 100)) : 0;
  const fullRailCardWidth = Math.max(260, width - spacing.lg * 2);
  const activeQuery = homeSearchFilters.query?.trim() ?? "";
  const activeOptionFilterCount = Math.max(0, activeFilterCount - (activeQuery ? 1 : 0));
  const showHomeSearchResults = Boolean(activeQuery) || activeOptionFilterCount > 0;
  const homeSearchResult = homeSearchQuery.data;
  const homeSearchResultCount = homeSearchResult?.total ?? 0;
  const homeSearchResultLabel = homeSearchResultCount === 1 ? "1 result" : `${homeSearchResultCount} results`;
  const clearHomeSearch = () => {
    clearHomeSearchFilters();
  };
  const openHomeFilters = () => {
    setFilterSheetVisible(true);
  };
  const loadMoreHomeResults = () => {
    setHomeSearchFilter("limit", (homeSearchFilters.limit ?? HOME_SEARCH_RESULT_LIMIT) + HOME_SEARCH_RESULT_LIMIT);
  };
  const removeHomeSearchFilter = useCallback(
    (key: keyof SearchParams, value?: string) => {
      setHomeSearchFilters((current) => {
        const next = { ...current, page: 1 };
        if (key === "fromDate") {
          delete next.fromDate;
          delete next.toDate;
          return next;
        }
        if (key === "minAmount") {
          delete next.minAmount;
          delete next.maxAmount;
          return next;
        }
        if (key === "categoryIds" && value) {
          next.categoryIds = current.categoryIds?.filter((id) => id !== value);
          return next;
        }
        if (key === "tagIds" && value) {
          next.tagIds = current.tagIds?.filter((id) => id !== value);
          return next;
        }
        delete next[key];
        return next;
      });
    },
    [setHomeSearchFilters]
  );
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
    <>
      <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">{t("home.greeting", { name: state.profile.displayName })}</AppText>
        </View>
        <View style={styles.headerActions}>
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
      </View>

      <SearchPill
        accessibilityLabel={t("home.searchExpenses")}
        placeholder={t("home.searchExpenses")}
        rightBadgeCount={activeOptionFilterCount}
        rightIcon="options-outline"
        rightIconAccessibilityLabel="Open search filters"
        value={homeSearchFilters.query ?? ""}
        onChangeText={(query) => setHomeSearchFilter("query", query || undefined)}
        onClear={() => setHomeSearchFilter("query", undefined)}
        onRightIconPress={openHomeFilters}
        showSearchIcon={false}
      />

      {showHomeSearchResults ? (
        <Card elevated={false} style={[styles.homeSearchResultsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.homeSearchResultsHeader}>
            <View style={styles.homeSearchResultsTitle}>
              <AppText variant="subtitle">Search results</AppText>
              <AppText variant="caption" muted>
                {homeSearchResultLabel}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Clear home search" hitSlop={8} onPress={clearHomeSearch} style={({ pressed }) => (pressed ? styles.pressed : null)}>
              <AppText variant="caption" style={{ color: theme.colors.primary }}>
                Clear
              </AppText>
            </Pressable>
          </View>
          <FilterChips
            params={homeSearchFilters}
            categories={state.categories}
            tags={state.tags}
            currency={state.profile.currency}
            onRemove={removeHomeSearchFilter}
            showQueryChip={false}
          />
          {homeSearchQuery.isLoading && !homeSearchResult ? (
            <View style={styles.homeSearchLoadingStack}>
              {[0, 1, 2].map((item) => (
                <View key={item} style={[styles.homeSearchSkeleton, { backgroundColor: theme.colors.surfaceMuted }]} />
              ))}
            </View>
          ) : homeSearchResult?.items.length ? (
            <View style={styles.homeSearchList}>
              {homeSearchResult.items.map((transaction) => (
                <SearchResultItem
                  key={transaction.id}
                  transaction={transaction}
                  category={state.categories.find((category) => category.id === transaction.categoryId)}
                  tags={state.getTagsByExpense(transaction.id)}
                  onPress={() =>
                    router.push({
                      pathname: "/modals/edit-transaction",
                      params: { transactionId: transaction.id }
                    })
                  }
                />
              ))}
              {homeSearchResult.hasMore ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Load more search results"
                  onPress={loadMoreHomeResults}
                  style={({ pressed }) => [
                    styles.homeSearchMoreButton,
                    { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
                    pressed ? styles.pressed : null
                  ]}
                >
                  <AppText variant="caption" style={{ color: theme.colors.primary }}>
                    Show more
                  </AppText>
                  <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={[styles.homeSearchEmpty, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name="search-outline" size={20} color={theme.colors.subtext} />
              <AppText variant="caption" muted>
                No expenses match your search.
              </AppText>
            </View>
          )}
        </Card>
      ) : null}

      <MoneyOverviewCard
        currency={state.profile.currency}
        daysLeft={daysLeft}
        onEditPlan={() => router.push("/modals/monthly-plan")}
        onOpenSafeSpend={() => setSafeSpendVisible(true)}
        progress={spendPlanProgress}
        snapshot={snapshot}
        t={t}
      />

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
                  tags={state.getTagsByExpense(transaction.id)}
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
      <SafeSpendSheet
        currency={state.profile.currency}
        daysLeft={daysLeft}
        onClose={() => setSafeSpendVisible(false)}
        snapshot={snapshot}
        visible={safeSpendVisible}
      />
      <FilterSheet
        visible={filterSheetVisible}
        params={homeSearchFilters}
        categories={state.categories}
        tags={state.tags}
        currency={state.profile.currency}
        onApply={(nextFilters) => {
          setHomeSearchFilters(nextFilters);
        }}
        onClearAll={clearHomeSearchFilters}
        onClose={() => setFilterSheetVisible(false)}
      />
    </>
  );
};

const MoneyOverviewCard = ({
  currency,
  daysLeft,
  onEditPlan,
  onOpenSafeSpend,
  progress,
  snapshot,
  t
}: {
  currency: AppCurrency;
  daysLeft: number;
  onEditPlan: () => void;
  onOpenSafeSpend: () => void;
  progress: number;
  snapshot: DashboardSnapshot;
  t: Translate;
}) => {
  const theme = useAppTheme();
  const isOver = snapshot.overspendMinor > 0;
  const statusAction = isOver ? "error" : snapshot.hasSpendAllocation ? "success" : "info";
  const statusLabel = isOver ? t("common.over") : snapshot.hasSpendAllocation ? t("common.onTrack") : t("home.badge.plan");
  const amountColor = isOver ? theme.colors.danger : theme.colors.success;

  return (
    <GluestackCard
      size="lg"
      variant="outline"
      className="gap-5"
      style={[styles.safeSpendOverviewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primaryBorder, shadowColor: theme.colors.shadow }]}
    >
      <VStack space="lg">
        <HStack style={styles.overviewHeader}>
          <VStack style={styles.overviewTitleBlock}>
            <AppText variant="label" muted>
              {t("home.moneyOverview")}
            </AppText>
            <AppText variant="title">{t("home.monthlyPlan")}</AppText>
          </VStack>
          <GluestackBadge action={statusAction} size="sm" variant="solid" style={styles.overviewBadge}>
            <BadgeText>{statusLabel}</BadgeText>
          </GluestackBadge>
        </HStack>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.canSpend")}
          accessibilityHint={t("home.safeSpend.openHint")}
          onPress={onOpenSafeSpend}
          style={({ pressed }) => [
            styles.safeSpendHero,
            { backgroundColor: isOver ? theme.colors.dangerSoft : theme.colors.successSoft, borderColor: isOver ? theme.colors.dangerBorder : theme.colors.successBorder },
            pressed ? styles.safeSpendHeroPressed : null
          ]}
        >
          <HStack style={styles.safeSpendHeroTop}>
            <VStack style={styles.safeSpendHeroCopy}>
              <AppText variant="caption" muted>
                {t("home.canSpend")}
              </AppText>
              <AppText style={[styles.safeSpendHeroAmount, { color: amountColor }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(snapshot.spendRemainingMinor, currency)}
              </AppText>
            </VStack>
            <View style={[styles.safeSpendInfoIcon, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.subtext} />
            </View>
          </HStack>
          <AppText variant="caption" style={{ color: amountColor }} numberOfLines={2}>
            {t("home.safeSpend.dailyLine", { amount: formatMoney(snapshot.safeDailySpendMinor, currency), count: daysLeft })}
          </AppText>
        </Pressable>

        <VStack space="sm">
          <HStack style={styles.progressHeader}>
            <AppText variant="caption" muted>
              {t("home.planProgress", {
                used: formatMoney(snapshot.committedSpendMinor, currency),
                allocation: formatMoney(snapshot.allocatedSpendMinor, currency)
              })}
            </AppText>
            <AppText variant="caption" style={[styles.progressPercent, { color: isOver ? theme.colors.danger : theme.colors.primary }]}>
              {progress}%
            </AppText>
          </HStack>
          <Progress value={progress} size="sm" className="overflow-hidden" style={{ backgroundColor: theme.colors.surfaceMuted }}>
            <ProgressFilledTrack className={isOver ? "bg-error-500" : "bg-success-500"} />
          </Progress>
        </VStack>

        <HStack space="md" style={styles.overviewStats}>
          <OverviewStat label={t("home.monthlySalary")} value={formatMoney(snapshot.incomeMinor, currency)} />
          <OverviewStat label={t("home.safeSpend.upcomingBills")} value={formatMoney(snapshot.expectedBillsMinor, currency)} />
          <OverviewStat label={t("home.safeSpend.goalReserve")} value={formatMoney(snapshot.savingsReserveMinor, currency)} />
        </HStack>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.editMonthlySpendAllocation")}
          onPress={onEditPlan}
          style={({ pressed }) => [styles.planSummary, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.planSummaryPressed : null]}
        >
          <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
          <AppText variant="caption" style={[styles.setPlanText, { color: theme.colors.primary }]}>
            {t("home.setPlan")}
          </AppText>
          <View style={[styles.planDivider, { backgroundColor: theme.colors.border }]} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.planSummaryText}>
            {t("home.allocation", { amount: formatMoney(snapshot.allocatedSpendMinor, currency) })}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.subtext} />
        </Pressable>
      </VStack>
    </GluestackCard>
  );
};

const OverviewStat = ({ label, value }: { label: string; value: string }) => {
  const theme = useAppTheme();

  return (
    <VStack space="xs" style={[styles.overviewStat, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
      <AppText variant="caption" muted numberOfLines={1}>
        {label}
      </AppText>
      <AppText style={[styles.overviewStatValue, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </VStack>
  );
};

const SafeSpendSheet = ({
  currency,
  daysLeft,
  onClose,
  snapshot,
  visible
}: {
  currency: AppCurrency;
  daysLeft: number;
  onClose: () => void;
  snapshot: DashboardSnapshot;
  visible: boolean;
}) => {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.closeAction")}
          onPress={onClose}
          style={styles.sheetBackdropPressable}
        />
        <View style={[styles.safeSpendSheet, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleBlock}>
              <AppText variant="title">{t("home.safeSpend.title")}</AppText>
              <AppText muted>{t("home.safeSpend.subtitle")}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.closeAction")}
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.sheetCloseButton, { backgroundColor: theme.colors.surfaceMuted }, pressed ? styles.sheetClosePressed : null]}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.breakdownGroup}>
            <BreakdownRow label={t("home.safeSpend.income")} value={snapshot.incomeMinor} currency={currency} />
            <BreakdownRow label={t("home.safeSpend.plannedSavings")} value={snapshot.plannedSavingsMinor} currency={currency} sign="minus" />
            <BreakdownRow emphasized label={t("home.safeSpend.spendAllocation")} value={snapshot.allocatedSpendMinor} currency={currency} />
          </View>

          <View style={styles.breakdownGroup}>
            <BreakdownRow label={t("home.safeSpend.spent")} value={snapshot.expenseMinor} currency={currency} sign="minus" />
            <BreakdownRow label={t("home.safeSpend.upcomingBills")} value={snapshot.expectedBillsMinor} currency={currency} sign="minus" />
            <BreakdownRow emphasized label={t("home.safeSpend.canSpend")} value={snapshot.spendRemainingMinor} currency={currency} tone={snapshot.overspendMinor > 0 ? "danger" : "success"} />
          </View>

          <View style={[styles.dailySafeBox, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryBorder }]}>
            <View>
              <AppText variant="caption" muted>
                {t("home.safeSpend.safeDaily")}
              </AppText>
              <AppText style={[styles.dailySafeAmount, { color: theme.colors.primary }]}>{formatMoney(snapshot.safeDailySpendMinor, currency)}</AppText>
            </View>
            <View style={styles.dailySafeMeta}>
              <AppText variant="caption" muted>
                {t("home.safeSpend.goalReserve")}
              </AppText>
              <AppText variant="caption" style={{ color: theme.colors.text }}>
                {formatMoney(snapshot.savingsReserveMinor, currency)}
              </AppText>
              <AppText variant="caption" muted>
                {t("home.safeSpend.daysLeft", { count: daysLeft })}
              </AppText>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.safeSpend.done")}
            onPress={onClose}
            style={({ pressed }) => [styles.sheetDoneButton, { backgroundColor: theme.colors.primary }, pressed ? styles.sheetDonePressed : null]}
          >
            <AppText style={[styles.sheetDoneText, { color: theme.colors.onPrimary }]}>{t("home.safeSpend.done")}</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const BreakdownRow = ({
  currency,
  emphasized,
  label,
  sign,
  tone,
  value
}: {
  currency: AppCurrency;
  emphasized?: boolean;
  label: string;
  sign?: "minus";
  tone?: "success" | "danger";
  value: number;
}) => {
  const theme = useAppTheme();
  const valueColor = tone === "success" ? theme.colors.success : tone === "danger" ? theme.colors.danger : theme.colors.text;
  const prefix = sign === "minus" && value > 0 ? "-" : "";

  return (
    <View style={[styles.breakdownRow, emphasized ? [styles.breakdownRowEmphasis, { borderTopColor: theme.colors.border }] : null]}>
      <AppText variant={emphasized ? "body" : "caption"} muted={!emphasized}>
        {label}
      </AppText>
      <AppText variant={emphasized ? "body" : "caption"} style={[styles.breakdownValue, { color: valueColor }]}>
        {prefix}
        {formatMoney(value, currency)}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
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
  homeSearchResultsCard: {
    gap: spacing.md,
    borderRadius: 22,
    padding: spacing.md
  },
  homeSearchResultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  homeSearchResultsTitle: {
    flex: 1,
    minWidth: 0
  },
  homeSearchList: {
    gap: spacing.sm
  },
  homeSearchLoadingStack: {
    gap: spacing.sm
  },
  homeSearchSkeleton: {
    height: 74,
    borderRadius: 18
  },
  homeSearchEmpty: {
    minHeight: 70,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  homeSearchMoreButton: {
    minHeight: 42,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  pressed: {
    opacity: 0.72
  },
  safeSpendOverviewCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 3
  },
  overviewTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  overviewBadge: {
    borderRadius: 999,
    minHeight: 28,
    paddingHorizontal: spacing.sm
  },
  safeSpendHero: {
    minHeight: 138,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
    justifyContent: "space-between",
    gap: spacing.md
  },
  safeSpendHeroPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }]
  },
  safeSpendHeroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  safeSpendHeroCopy: {
    flex: 1,
    minWidth: 0
  },
  safeSpendHeroAmount: {
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: 0
  },
  safeSpendInfoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  progressPercent: {
    fontWeight: "900"
  },
  overviewStats: {
    flexDirection: "row",
    alignItems: "stretch"
  },
  overviewStat: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    justifyContent: "space-between"
  },
  overviewStatValue: {
    fontSize: 15,
    lineHeight: 20,
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
  metricTilePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  metricTopLine: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
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
    justifyContent: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#F8FAFC"
  },
  planSummaryText: {
    flex: 1,
    minWidth: 0
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
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.54)"
  },
  sheetBackdropPressable: {
    ...StyleSheet.absoluteFillObject
  },
  safeSpendSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.42)"
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  sheetTitleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  sheetCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  sheetClosePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  breakdownGroup: {
    gap: spacing.sm
  },
  breakdownRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  breakdownRowEmphasis: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.xs
  },
  breakdownValue: {
    flexShrink: 0,
    fontWeight: "900",
    textAlign: "right"
  },
  dailySafeBox: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  dailySafeAmount: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  dailySafeMeta: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2
  },
  sheetDoneButton: {
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  sheetDonePressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  },
  sheetDoneText: {
    fontWeight: "900"
  }
});
