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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/money";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";
import type { CurrencyCode } from "@/types/domain";

type IconName = keyof typeof Ionicons.glyphMap;
type CapabilityStatus = "Live" | "Next" | "Planned";
type ActionTone = "primary" | "success" | "warning" | "danger" | "neutral";

interface QuickAction {
  label: string;
  caption: string;
  icon: IconName;
  tone: ActionTone;
  onPress: () => void;
}

interface Capability {
  label: string;
  caption: string;
  icon: IconName;
  status: CapabilityStatus;
}

const CAPABILITIES: Capability[] = [
  { label: "Groups", caption: "Trips, home, office", icon: "people-outline", status: "Live" },
  { label: "Smart splits", caption: "6 split methods", icon: "calculator-outline", status: "Live" },
  { label: "Itemized bills", caption: "By consumption", icon: "restaurant-outline", status: "Live" },
  { label: "Balances", caption: "Who owes whom", icon: "wallet-outline", status: "Live" },
  { label: "Debt simplify", caption: "Fewest transfers", icon: "git-compare-outline", status: "Live" },
  { label: "Export", caption: "CSV / PDF", icon: "document-text-outline", status: "Live" },
  { label: "Travel mode", caption: "Trip workspace", icon: "airplane-outline", status: "Next" },
  { label: "Invite links", caption: "Shared access", icon: "link-outline", status: "Planned" },
  { label: "Reminders", caption: "Payment nudges", icon: "notifications-outline", status: "Planned" },
  { label: "Sync", caption: "Live updates", icon: "sync-outline", status: "Planned" }
];

const statusTone = (status: CapabilityStatus) => (status === "Live" ? "success" : status === "Next" ? "warning" : "neutral");

export const SplitHomeScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();

  const groupSummaries = state.groups.map((group) => {
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
  const totalSpentMinor = groupSummaries.reduce((total, item) => total + item.totalSpentMinor, 0);
  const netPositionMinor = totalOwedToUser - totalUserOwes;
  const currencies = new Set(groupSummaries.map((item) => item.group.currency));
  const hasMixedCurrencies = currencies.size > 1;
  const displayCurrency = state.profile.currency;
  const settlementPreview = groupSummaries.filter((item) => item.currentBalance !== 0).slice(0, 2);
  const quickActions: QuickAction[] = [
    {
      label: "Create group",
      caption: "Trips, flatmates, teams",
      icon: "people-outline",
      tone: "primary",
      onPress: () => router.push("/modals/create-group")
    },
    {
      label: "Add bill",
      caption: "Equal or advanced split",
      icon: "receipt-outline",
      tone: "success",
      onPress: () => router.push("/modals/add-split-expense")
    },
    {
      label: "Settle",
      caption: "Minimized transfers",
      icon: "swap-horizontal",
      tone: "warning",
      onPress: () => router.push("/modals/settle-up")
    },
    {
      label: "Itemize",
      caption: "Receipt-style split",
      icon: "sparkles-outline",
      tone: "neutral",
      onPress: () => router.push("/modals/smart-receipt-split")
    }
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="hero">Split</AppText>
          <AppText muted>Shared expenses for trips, homes, family plans, and teams.</AppText>
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
          <StatusBadge label={`${activeGroupCount} groups`} tone="ai" />
          <View style={[styles.syncBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name="phone-portrait-outline" size={15} color={theme.colors.primary} />
            <AppText variant="caption" style={{ color: theme.colors.primary }}>
              Offline ready
            </AppText>
          </View>
        </View>

        <View style={styles.netBlock}>
          <AppText variant="caption" muted>
            Net position
          </AppText>
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

        <View style={styles.metricGrid}>
          <MetricPill label="You are owed" valueMinor={hasMixedCurrencies ? null : totalOwedToUser} currency={displayCurrency} tone="success" />
          <MetricPill label="You owe" valueMinor={hasMixedCurrencies ? null : totalUserOwes} currency={displayCurrency} tone="danger" />
          <MetricPill label="Total tracked" valueMinor={hasMixedCurrencies ? null : totalSpentMinor} currency={displayCurrency} tone="neutral" />
          <MetricPill label="Unsettled" value={`${unsettledGroupCount}`} tone="primary" />
        </View>
      </Card>

      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <QuickActionTile key={action.label} action={action} />
        ))}
      </View>

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="subtitle">Settlement queue</AppText>
            <AppText variant="caption" muted>
              Simplified balances from active groups.
            </AppText>
          </View>
          <Button variant="ghost" size="compact" onPress={() => router.push("/modals/settle-up")}>
            View
          </Button>
        </View>
        {settlementPreview.length > 0 ? (
          settlementPreview.map((item) => (
            <View key={item.group.id} style={[styles.settlementRow, { borderColor: theme.colors.border }]}>
              <View style={styles.settlementCopy}>
                <AppText>{item.group.name}</AppText>
                <AppText variant="caption" muted>
                  {item.currentBalance > 0 ? "You are owed" : "You owe"}
                </AppText>
              </View>
              <MoneyAmount amountMinor={Math.abs(item.currentBalance)} currency={item.group.currency} size="body" />
            </View>
          ))
        ) : (
          <View style={[styles.emptyStrip, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.success} />
            <AppText muted>All visible groups are settled.</AppText>
          </View>
        )}
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <AppText variant="subtitle">Groups</AppText>
          <AppText variant="caption" muted>
            Running balances, history, export, and settlements.
          </AppText>
        </View>
        <Button variant="ghost" size="compact" onPress={() => router.push("/modals/add-split-expense")}>
          Add expense
        </Button>
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

      <Card style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <AppText variant="subtitle">Split toolkit</AppText>
            <AppText variant="caption" muted>
              Everything shared-expense related stays here.
            </AppText>
          </View>
          <Button variant="ghost" size="compact" onPress={() => router.push("/modals/data-export")}>
            Export
          </Button>
        </View>
        <View style={styles.capabilityGrid}>
          {CAPABILITIES.map((capability) => (
            <CapabilityTile key={capability.label} capability={capability} />
          ))}
        </View>
      </Card>
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

const MetricPill = ({
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
  tone: "primary" | "success" | "danger" | "neutral";
}) => {
  const theme = useAppTheme();
  const palette = getActionTone(tone, theme);
  const displayValue = value ?? (valueMinor === null || valueMinor === undefined ? "Mixed" : formatMoney(valueMinor, currency));

  return (
    <View style={[styles.metricPill, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <AppText variant="caption" style={{ color: palette.muted }} numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="subtitle" style={{ color: palette.text }} numberOfLines={1}>
        {displayValue}
      </AppText>
    </View>
  );
};

const CapabilityTile = ({ capability }: { capability: Capability }) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.capabilityTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}>
      <View style={styles.capabilityTopRow}>
        <View style={[styles.capabilityIcon, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={capability.icon} size={18} color={theme.colors.primary} />
        </View>
        <MiniStatus label={capability.status} tone={statusTone(capability.status)} />
      </View>
      <AppText variant="caption" style={styles.capabilityTitle}>
        {capability.label}
      </AppText>
      <AppText variant="caption" muted numberOfLines={1}>
        {capability.caption}
      </AppText>
    </View>
  );
};

const MiniStatus = ({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" }) => {
  const theme = useAppTheme();
  const backgroundColor = tone === "success" ? theme.colors.successSoft : tone === "warning" ? theme.colors.warningSoft : theme.colors.surface;
  const color = tone === "success" ? theme.colors.success : tone === "warning" ? theme.colors.warning : theme.colors.subtext;

  return (
    <View style={[styles.miniStatus, { backgroundColor }]}>
      <AppText variant="caption" style={[styles.miniStatusText, { color }]}>
        {label}
      </AppText>
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
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  netBlock: {
    gap: spacing.xs
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  metricPill: {
    width: "48%",
    minHeight: 76,
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  quickAction: {
    width: "48%",
    minHeight: 104,
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
  card: {
    gap: spacing.md
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  settlementRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md
  },
  settlementCopy: {
    flex: 1
  },
  emptyStrip: {
    minHeight: 68,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  capabilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  capabilityTile: {
    width: "48%",
    minHeight: 108,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  capabilityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  capabilityIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  capabilityTitle: {
    fontWeight: "800"
  },
  miniStatus: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  miniStatusText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800"
  }
});
