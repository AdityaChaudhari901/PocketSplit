import { StyleSheet, View } from "react-native";

import { Badge, BadgeText } from "@/components/gluestack/badge";
import { Card as GluestackCard } from "@/components/gluestack/card";
import { HStack } from "@/components/gluestack/hstack";
import { Progress, ProgressFilledTrack } from "@/components/gluestack/progress";
import { VStack } from "@/components/gluestack/vstack";
import { AppText } from "@/components/ui/AppText";
import { useTranslation } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { BudgetUsage } from "@/lib/money";
import type { Category, CurrencyCode } from "@/types/domain";

interface BudgetProgressCardProps {
  category: Category;
  usage: BudgetUsage;
  currency: CurrencyCode;
}

export const BudgetProgressCard = ({ category, usage, currency }: BudgetProgressCardProps) => {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const tone = usage.status === "safe" ? "success" : usage.status === "watch" ? "warning" : "danger";
  const badgeAction = usage.status === "safe" ? "success" : usage.status === "watch" ? "warning" : "error";
  const trackClassName = usage.status === "safe" ? "bg-success-500" : usage.status === "watch" ? "bg-warning-500" : "bg-error-500";
  const statusLabel = usage.status === "safe" ? t("common.onTrack") : usage.status === "watch" ? t("common.watch") : t("common.over");
  const remainingColor = usage.remainingMinor >= 0 ? theme.colors.success : theme.colors.danger;

  return (
    <GluestackCard
      size="md"
      variant="outline"
      className="gap-4"
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: tone === "danger" ? theme.colors.dangerBorder : theme.colors.border }]}
    >
      <HStack style={styles.row}>
        <VStack style={styles.copy} space="xs">
          <AppText variant="subtitle">{category.name}</AppText>
          <AppText variant="caption" muted>
            {formatMoney(usage.spentMinor, currency)} of {formatMoney(usage.budgetMinor, currency)}
          </AppText>
        </VStack>
        <VStack style={styles.statusStack} space="xs">
          <Badge action={badgeAction} size="sm" variant="solid" style={styles.badge}>
            <BadgeText>{statusLabel}</BadgeText>
          </Badge>
          <AppText variant="subtitle" style={{ color: tone === "danger" ? theme.colors.danger : theme.colors.text }}>
            {usage.percentage}%
          </AppText>
        </VStack>
      </HStack>
      <Progress value={Math.min(100, usage.percentage)} size="sm" className="overflow-hidden" style={{ backgroundColor: theme.colors.surfaceMuted }}>
        <ProgressFilledTrack className={trackClassName} />
      </Progress>
      <View style={styles.remainingRow}>
        <AppText variant="caption" muted>
          {t("common.remaining")}
        </AppText>
        <AppText variant="caption" style={[styles.remainingValue, { color: remainingColor }]}>
          {formatMoney(usage.remainingMinor, currency)}
        </AppText>
      </View>
    </GluestackCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  statusStack: {
    alignItems: "flex-end"
  },
  badge: {
    borderRadius: 999,
    minHeight: 26,
    paddingHorizontal: spacing.sm
  },
  remainingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  remainingValue: {
    fontWeight: "900"
  }
});
