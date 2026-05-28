import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BudgetProgressCard } from "@/components/cards/BudgetProgressCard";
import { CategoryPill } from "@/components/forms/CategoryPill";
import { Badge, BadgeText } from "@/components/gluestack/badge";
import { Card as GluestackCard } from "@/components/gluestack/card";
import { HStack } from "@/components/gluestack/hstack";
import { Progress, ProgressFilledTrack } from "@/components/gluestack/progress";
import { VStack } from "@/components/gluestack/vstack";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { monthKey } from "@/lib/dates";
import { useTranslation } from "@/lib/i18n";
import { calculateBudgetUsage, formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import { majorToMinor } from "@/schemas/transaction.schema";
import { useAppStore } from "@/store/app.store";

export const BudgetPlannerScreen = () => {
  const state = useAppStore();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const addBudget = useAppStore((store) => store.addBudget);
  const categories = state.categories.filter((category) => category.kind === "expense");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const budgetRows = state.budgets
    .map((budget) => {
      const category = state.categories.find((item) => item.id === budget.categoryId);
      return category
        ? {
            budget,
            category,
            usage: calculateBudgetUsage(state.getCategorySpend(budget.categoryId, budget.month), budget.amountMinor)
          }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const totalBudgetMinor = budgetRows.reduce((sum, row) => sum + row.budget.amountMinor, 0);
  const totalSpentMinor = budgetRows.reduce((sum, row) => sum + row.usage.spentMinor, 0);
  const overallProgress = totalBudgetMinor > 0 ? Math.min(100, Math.round((totalSpentMinor / totalBudgetMinor) * 100)) : 0;
  const atRiskCount = budgetRows.filter((row) => row.usage.status !== "safe").length;
  const selectedCategoryName = categories.find((category) => category.id === categoryId)?.name ?? t("budget.categoryFallback");

  const save = () => {
    const amountMinor = majorToMinor(amount, state.profile.currency);
    if (!categoryId || amountMinor <= 0) {
      Alert.alert(t("budget.invalidTitle"), t("budget.invalidBody"));
      return;
    }
    const now = new Date().toISOString();
    addBudget({
      id: `budget-${Date.now()}`,
      ownerId: state.profile.id,
      categoryId,
      month: monthKey(),
      amountMinor,
      currency: state.profile.currency,
      createdAt: now,
      updatedAt: now,
      createdBy: state.profile.id,
      updatedBy: state.profile.id
    });
    setAmount("");
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="hero">{t("budget.title")}</AppText>
        <AppText muted>{t("budget.subtitle")}</AppText>
      </View>

      <GluestackCard
        size="lg"
        variant="outline"
        className="gap-5"
        style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primaryBorder, shadowColor: theme.colors.shadow }]}
      >
        <HStack style={styles.summaryTop}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="wallet-outline" size={22} color={theme.colors.primary} />
          </View>
          <VStack style={styles.summaryCopy} space="xs">
            <AppText variant="label" muted>
              {t("budget.monthlyBudget")}
            </AppText>
            <AppText style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(totalSpentMinor, state.profile.currency)}
            </AppText>
            <AppText variant="caption" muted>
              {t("budget.spentOf", {
                spent: formatMoney(totalSpentMinor, state.profile.currency),
                budget: formatMoney(totalBudgetMinor, state.profile.currency)
              })}
            </AppText>
          </VStack>
          <Badge action={atRiskCount > 0 ? "warning" : "success"} size="sm" variant="solid" style={styles.badge}>
            <BadgeText>{budgetRows.length === 0 ? t("budget.noBudgetsBadge") : atRiskCount > 0 ? t("budget.watchCount", { count: atRiskCount }) : t("common.onTrack")}</BadgeText>
          </Badge>
        </HStack>
        <VStack space="sm">
          <HStack style={styles.progressHeader}>
            <AppText variant="caption" muted>
              {t("budget.planUsage")}
            </AppText>
            <AppText variant="caption" style={[styles.progressPercent, { color: atRiskCount > 0 ? theme.colors.warning : theme.colors.primary }]}>
              {overallProgress}%
            </AppText>
          </HStack>
          <Progress value={overallProgress} size="sm" className="overflow-hidden" style={{ backgroundColor: theme.colors.surfaceMuted }}>
            <ProgressFilledTrack className={atRiskCount > 0 ? "bg-warning-500" : "bg-success-500"} />
          </Progress>
        </VStack>
      </GluestackCard>

      <GluestackCard size="md" variant="outline" className="gap-4" style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <HStack style={styles.builderHeader}>
          <VStack style={styles.builderCopy} space="xs">
            <AppText variant="subtitle">{t("budget.addGuardrail")}</AppText>
            <AppText variant="caption" muted>
              {t("budget.protectCategory", { category: selectedCategoryName })}
            </AppText>
          </VStack>
          <View style={[styles.builderIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
          </View>
        </HStack>
        <TextField label={t("budget.amount")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={t("budget.amountPlaceholder")} />
        <View style={styles.pills}>
          {categories.map((category) => (
            <CategoryPill key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
          ))}
        </View>
        <Button onPress={save} icon="checkmark-circle">
          {t("budget.save")}
        </Button>
      </GluestackCard>

      <View style={styles.listHeader}>
        <AppText variant="subtitle">{t("budget.activeBudgets")}</AppText>
        <AppText variant="caption" muted>
          {t("budget.totalCount", { count: budgetRows.length })}
        </AppText>
      </View>
      {budgetRows.map(({ budget, category, usage }) => (
        <BudgetProgressCard
          key={budget.id}
          usage={usage}
          category={category}
          currency={budget.currency}
        />
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 2
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0
  },
  summaryAmount: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900"
  },
  badge: {
    borderRadius: 999,
    minHeight: 28,
    paddingHorizontal: spacing.sm
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
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.lg
  },
  builderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  builderCopy: {
    flex: 1,
    minWidth: 0
  },
  builderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
