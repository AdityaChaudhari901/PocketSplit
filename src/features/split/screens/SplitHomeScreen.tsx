import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { SplitGroupCard } from "@/components/split/SplitGroupCard";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";
import type { CurrencyCode } from "@/types/domain";

type IconName = keyof typeof Ionicons.glyphMap;
type ActionTone = "primary" | "success" | "warning" | "danger" | "neutral";

interface QuickAction {
  label: string;
  caption: string;
  icon: IconName;
  tone: ActionTone;
  onPress: () => void;
}

export const SplitHomeScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();

  const groupSummaries = state.groups
    .filter((group) => !group.deletedAt)
    .map((group) => {
      const expenses = state.getGroupExpenses(group.id);
      const currentMember = group.members.find((member) => member.isCurrentUser) ?? group.members[0];
      const balances = state.getGroupBalances(group.id);
      const currentBalance = balances.find((balance) => balance.memberId === currentMember?.id)?.netMinor ?? 0;
      const totalSpentMinor = expenses.reduce((total, expense) => total + expense.amountMinor, 0);
      return { group, currentBalance, totalSpentMinor };
    });

  const totalOwedToUser = groupSummaries.filter((item) => item.currentBalance > 0).reduce((total, item) => total + item.currentBalance, 0);
  const totalUserOwes = groupSummaries.filter((item) => item.currentBalance < 0).reduce((total, item) => total + Math.abs(item.currentBalance), 0);
  const activeGroupCount = groupSummaries.length;
  const unsettledGroupCount = groupSummaries.filter((item) => item.currentBalance !== 0).length;
  const netPositionMinor = totalOwedToUser - totalUserOwes;
  const currencies = new Set(groupSummaries.map((item) => item.group.currency));
  const hasMixedCurrencies = currencies.size > 1;
  const displayCurrency = state.profile.currency;
  const quickActions: QuickAction[] = [
    {
      label: "Create group",
      caption: "Start a shared balance",
      icon: "people-outline",
      tone: "primary",
      onPress: () => router.push("/modals/create-group")
    },
    {
      label: "Add bill",
      caption: "Split a group expense",
      icon: "receipt-outline",
      tone: "success",
      onPress: () => router.push("/modals/add-split-expense")
    },
    {
      label: "Settle",
      caption: "See who pays whom",
      icon: "swap-horizontal",
      tone: "warning",
      onPress: () => router.push("/modals/settle-up")
    }
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">Split</AppText>
          <AppText muted>Groups, balances, and shared bills.</AppText>
        </View>
        <Button onPress={() => router.push("/modals/create-group")} icon="add">
          Group
        </Button>
      </View>

      <Card
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.mode === "dark" ? theme.colors.surfaceRaised : theme.colors.surface
          }
        ]}
      >
        <View style={styles.heroTopRow}>
          <AppText variant="caption" muted>
            Overall balance
          </AppText>
          <AppText variant="caption" muted>
            {activeGroupCount} {activeGroupCount === 1 ? "group" : "groups"}
          </AppText>
        </View>

        <View style={styles.netBlock}>
          {hasMixedCurrencies ? (
            <AppText variant="title">Mixed currencies</AppText>
          ) : (
            <MoneyAmount amountMinor={Math.abs(netPositionMinor)} currency={displayCurrency} size="hero" />
          )}
          <AppText muted>
            {hasMixedCurrencies
              ? "Open each group for exact balances."
              : netPositionMinor >= 0
                ? "You are owed overall"
                : "You owe overall"}
          </AppText>
        </View>

        <View style={styles.balanceStrip}>
          <BalanceMetric label="Owed to you" valueMinor={hasMixedCurrencies ? null : totalOwedToUser} currency={displayCurrency} tone="success" />
          <BalanceMetric label="You owe" valueMinor={hasMixedCurrencies ? null : totalUserOwes} currency={displayCurrency} tone="danger" />
          <BalanceMetric label="Unsettled" value={`${unsettledGroupCount}`} tone="neutral" />
        </View>
      </Card>

      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <QuickActionTile key={action.label} action={action} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <AppText variant="subtitle">Groups</AppText>
          <AppText variant="caption" muted>
            Open a group for members, balances, and history.
          </AppText>
        </View>
      </View>

      {groupSummaries.length > 0 ? (
        groupSummaries.map((item) => (
          <SplitGroupCard
            key={item.group.id}
            group={item.group}
            netMinor={item.currentBalance}
            totalSpentMinor={item.totalSpentMinor}
            currency={item.group.currency}
            onPress={() => router.push(`/modals/group-detail/${item.group.id}`)}
          />
        ))
      ) : (
        <EmptyState
          icon="people"
          title="No split groups yet"
          body="Create a group for trips, flatmates, family budgets, or office lunches."
          actionLabel="Create Group"
          onAction={() => router.push("/modals/create-group")}
        />
      )}
    </Screen>
  );
};

const QuickActionTile = ({ action }: { action: QuickAction }) => {
  const theme = useAppTheme();
  const tone = getActionTone(action.tone, theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: tone.background,
          borderColor: tone.border,
          opacity: pressed ? 0.78 : 1
        }
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: tone.iconBackground }]}>
        <Ionicons name={action.icon} size={22} color={tone.icon} />
      </View>
      <View style={styles.quickCopy}>
        <AppText variant="caption" style={{ color: tone.text, fontWeight: "800" }}>
          {action.label}
        </AppText>
        <AppText variant="caption" style={{ color: tone.muted }} numberOfLines={1}>
          {action.caption}
        </AppText>
      </View>
    </Pressable>
  );
};

const BalanceMetric = ({
  label,
  valueMinor,
  value,
  currency,
  tone
}: {
  label: string;
  valueMinor?: number | null;
  value?: string;
  currency?: CurrencyCode;
  tone: "success" | "danger" | "neutral";
}) => {
  const theme = useAppTheme();
  const palette = getActionTone(tone, theme);
  const displayValue = value ?? (valueMinor === null || valueMinor === undefined ? "Mixed" : null);

  return (
    <View style={[styles.balanceMetric, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <AppText variant="caption" style={{ color: palette.muted }} numberOfLines={1}>
        {label}
      </AppText>
      {displayValue ? (
        <AppText variant="subtitle" style={{ color: palette.text }} numberOfLines={1}>
          {displayValue}
        </AppText>
      ) : currency ? (
        <MoneyAmount amountMinor={valueMinor ?? 0} currency={currency} size="body" />
      ) : null}
    </View>
  );
};

const getActionTone = (tone: ActionTone, theme: ReturnType<typeof useAppTheme>) => {
  if (tone === "success") {
    return {
      background: theme.colors.successSoft,
      border: theme.colors.successBorder,
      iconBackground: theme.colors.surface,
      icon: theme.colors.success,
      text: theme.colors.success,
      muted: theme.colors.subtext
    };
  }

  if (tone === "warning") {
    return {
      background: theme.colors.warningSoft,
      border: theme.colors.warningBorder,
      iconBackground: theme.colors.surface,
      icon: theme.colors.warning,
      text: theme.colors.warning,
      muted: theme.colors.subtext
    };
  }

  if (tone === "danger") {
    return {
      background: theme.colors.dangerSoft,
      border: theme.colors.dangerBorder,
      iconBackground: theme.colors.surface,
      icon: theme.colors.danger,
      text: theme.colors.danger,
      muted: theme.colors.subtext
    };
  }

  if (tone === "neutral") {
    return {
      background: theme.colors.surfaceMuted,
      border: theme.colors.border,
      iconBackground: theme.colors.surface,
      icon: theme.colors.primary,
      text: theme.colors.text,
      muted: theme.colors.subtext
    };
  }

  return {
    background: theme.colors.primarySoft,
    border: theme.colors.primaryBorder,
    iconBackground: theme.colors.surface,
    icon: theme.colors.primary,
    text: theme.colors.primary,
    muted: theme.colors.subtext
  };
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  heroCard: {
    gap: spacing.lg,
    overflow: "hidden"
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  netBlock: {
    gap: spacing.xs
  },
  balanceStrip: {
    flexDirection: "row",
    gap: spacing.sm
  },
  balanceMetric: {
    flex: 1,
    minHeight: 72,
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md
  },
  quickGrid: {
    flexDirection: "row",
    gap: spacing.md
  },
  quickAction: {
    flex: 1,
    minHeight: 98,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  quickCopy: {
    gap: spacing.xs
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
