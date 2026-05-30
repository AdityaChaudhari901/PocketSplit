import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { PaywallCard } from "@/components/cards/PaywallCard";
import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { type SplitDraft, validateSplit } from "@/lib/split";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { majorToMinor, minorToMajorInput } from "@/schemas/transaction.schema";
import { canUseFeature } from "@/services/entitlement.service";
import { createSplitExpense } from "@/services/split.service";
import { useAppStore } from "@/store/app.store";
import type { SplitMember, SplitMethod } from "@/types/domain";

const METHODS: { value: SplitMethod; label: string; body: string }[] = [
  { value: "equal", label: "Equal", body: "Split evenly across selected members." },
  { value: "exact", label: "Exact", body: "Enter each member's exact amount." },
  { value: "percentage", label: "Percent", body: "Assign percentages that total 100%." },
  { value: "shares", label: "Shares", body: "Use weighted shares like 2:1." },
  { value: "itemwise", label: "Item-wise", body: "Enter item totals per member." },
  { value: "custom", label: "Custom", body: "Manually set each member share." }
];

interface SplitInput {
  included: boolean;
  amountMajor: string;
  percentage: string;
  shares: string;
}

const createDefaultInput = (): SplitInput => ({
  included: true,
  amountMajor: "",
  percentage: "",
  shares: "1"
});

const methodLabel = (method: SplitMethod): string => METHODS.find((item) => item.value === method)?.label ?? method;

const valueLabel = (method: SplitMethod): string => {
  if (method === "percentage") return "Percent";
  if (method === "shares") return "Shares";
  return "Amount";
};

const parsePercentageBps = (value: string): number => {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return 0;
  }

  const [whole = "0", fraction = ""] = normalized.split(".");
  return Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0").slice(0, 2) || "0", 10);
};

const percentageBpsToInput = (bps: number): string => {
  const whole = Math.floor(bps / 100);
  const fraction = bps % 100;
  if (fraction === 0) {
    return `${whole}`;
  }
  return `${whole}.${`${fraction}`.padStart(2, "0").replace(/0+$/, "")}`;
};

const distributeBps = (memberIds: string[]): Record<string, string> => {
  if (memberIds.length === 0) {
    return {};
  }

  const base = Math.floor(10000 / memberIds.length);
  let remainder = 10000 - base * memberIds.length;
  return Object.fromEntries(
    memberIds.map((memberId) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return [memberId, percentageBpsToInput(base + extra)];
    })
  );
};

const distributeAmountMajor = (amountMinor: number, members: SplitMember[], currency: SplitMemberGroupCurrency): Record<string, string> => {
  const memberIds = members.map((member) => member.id);
  if (memberIds.length === 0 || amountMinor <= 0) {
    return {};
  }

  const base = Math.floor(amountMinor / memberIds.length);
  let remainder = amountMinor - base * memberIds.length;
  return Object.fromEntries(
    memberIds.map((memberId) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return [memberId, minorToMajorInput(base + extra, currency)];
    })
  );
};

type SplitMemberGroupCurrency = Parameters<typeof minorToMajorInput>[1];

const buildDrafts = ({
  members,
  inputs,
  method,
  currency
}: {
  members: SplitMember[];
  inputs: Record<string, SplitInput>;
  method: SplitMethod;
  currency: SplitMemberGroupCurrency;
}): SplitDraft[] =>
  members.map((member) => {
    const input = inputs[member.id] ?? createDefaultInput();
    const draft: SplitDraft = {
      memberId: member.id,
      excluded: !input.included
    };

    if (!input.included) {
      return draft;
    }

    if (method === "exact" || method === "itemwise" || method === "custom") {
      draft.amountMinor = majorToMinor(input.amountMajor, currency);
    }

    if (method === "percentage") {
      draft.percentageBps = parsePercentageBps(input.percentage);
    }

    if (method === "shares") {
      draft.shares = Number.parseInt(input.shares, 10) || 0;
    }

    return draft;
  });

export const AddSplitExpenseScreen = () => {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const theme = useAppTheme();
  const state = useAppStore();
  const addGroupExpense = useAppStore((store) => store.addGroupExpense);
  const group = state.groups.find((item) => item.id === groupId) ?? state.groups[0];
  const activeMembers = useMemo(() => group?.members.filter((member) => !member.deletedAt) ?? [], [group?.members]);
  const activeMemberIds = useMemo(() => activeMembers.map((member) => member.id), [activeMembers]);
  const [title, setTitle] = useState("Hotel");
  const [amount, setAmount] = useState("4000");
  const [method, setMethod] = useState<SplitMethod>("equal");
  const [paidByMemberId, setPaidByMemberId] = useState(group?.members[0]?.id ?? "");
  const [splitInputs, setSplitInputs] = useState<Record<string, SplitInput>>({});
  const amountMinor = group ? majorToMinor(amount, group.currency) : 0;
  const canUseAdvancedSplit = method === "equal" || canUseFeature(state.entitlement, "advanced_split");

  useEffect(() => {
    setSplitInputs((current) => {
      const next: Record<string, SplitInput> = {};
      activeMembers.forEach((member) => {
        next[member.id] = current[member.id] ?? createDefaultInput();
      });
      return next;
    });
  }, [activeMembers]);

  const includedMembers = useMemo(() => activeMembers.filter((member) => splitInputs[member.id]?.included ?? true), [activeMembers, splitInputs]);

  const drafts = useMemo(
    () =>
      group
        ? buildDrafts({
            members: activeMembers,
            inputs: splitInputs,
            method,
            currency: group.currency
          })
        : [],
    [activeMembers, group, method, splitInputs]
  );

  const validation = useMemo(
    () =>
      validateSplit({
        amountMinor,
        method,
        drafts,
        memberIds: activeMemberIds
      }),
    [activeMemberIds, amountMinor, drafts, method]
  );

  const allocatedMinor = validation.splits.reduce((total, split) => total + split.amountMinor, 0);
  const canSave = Boolean(group && title.trim().length >= 2 && paidByMemberId && canUseAdvancedSplit && validation.valid);

  const updateMemberInput = (memberId: string, patch: Partial<SplitInput>) => {
    setSplitInputs((current) => ({
      ...current,
      [memberId]: {
        ...(current[memberId] ?? createDefaultInput()),
        ...patch
      }
    }));
  };

  const autofillDetails = (nextMethod = method) => {
    if (!group) {
      return;
    }

    const includedIds = includedMembers.map((member) => member.id);
    const amountMajorByMember = distributeAmountMajor(amountMinor, includedMembers, group.currency);
    const percentageByMember = distributeBps(includedIds);

    setSplitInputs((current) => {
      const next = { ...current };
      activeMembers.forEach((member) => {
        const input = next[member.id] ?? createDefaultInput();
        if (!input.included) {
          next[member.id] = input;
          return;
        }

        next[member.id] = {
          ...input,
          amountMajor: nextMethod === "exact" || nextMethod === "itemwise" || nextMethod === "custom" ? (amountMajorByMember[member.id] ?? "") : input.amountMajor,
          percentage: nextMethod === "percentage" ? (percentageByMember[member.id] ?? "") : input.percentage,
          shares: nextMethod === "shares" ? "1" : input.shares
        };
      });
      return next;
    });
  };

  const selectMethod = (nextMethod: SplitMethod) => {
    setMethod(nextMethod);
    autofillDetails(nextMethod);
  };

  const save = () => {
    if (!group) {
      Alert.alert("Create a group first", "Split expenses need a group.");
      return;
    }

    if (!canUseFeature(state.entitlement, "group_expense")) {
      Alert.alert("Group expense limit reached", "Upgrade for unlimited group expenses.");
      return;
    }

    if (!canUseAdvancedSplit) {
      Alert.alert("Advanced split is premium", "Free users can use equal split. Upgrade for exact, percentage, shares, item-wise, and custom splits.");
      return;
    }

    if (!validation.valid) {
      Alert.alert("Invalid split", validation.errors.join("\n"));
      return;
    }

    try {
      const expense = createSplitExpense({
        groupId: group.id,
        title: title.trim(),
        amountMinor,
        currency: group.currency,
        paidByMemberId,
        splitMethod: method,
        drafts,
        members: group.members,
        createdBy: state.profile.id
      });
      addGroupExpense(expense);
      router.push(`/modals/group-detail/${group.id}`);
    } catch (error) {
      Alert.alert("Invalid split", error instanceof Error ? error.message : "Please review the split.");
    }
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Add split expense</AppText>
        <AppText muted>Choose who paid, who participated, and how the bill should be divided.</AppText>
      </View>

      {!canUseAdvancedSplit ? (
        <PaywallCard title="Advanced splits are Premium" body="Equal split is available now. Upgrade for exact, percentage, shares, item-wise, and custom splits." />
      ) : null}

      <Card style={styles.form}>
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

        <AppText variant="label" muted>
          Paid by
        </AppText>
        <View style={styles.pills}>
          {activeMembers.map((member) => (
            <CategoryPill key={member.id} label={member.displayName} selected={paidByMemberId === member.id} onPress={() => setPaidByMemberId(member.id)} />
          ))}
        </View>

        <AppText variant="label" muted>
          Participants
        </AppText>
        <View style={styles.memberGrid}>
          {activeMembers.map((member) => {
            const included = splitInputs[member.id]?.included ?? true;
            return (
              <Pressable
                key={member.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: included }}
                onPress={() => updateMemberInput(member.id, { included: !included })}
                style={({ pressed }) => [
                  styles.memberToggle,
                  {
                    backgroundColor: included ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                    borderColor: included ? theme.colors.primaryBorder : theme.colors.border
                  },
                  pressed ? styles.pressed : null
                ]}
              >
                <Ionicons name={included ? "checkmark-circle" : "ellipse-outline"} size={18} color={included ? theme.colors.primary : theme.colors.subtext} />
                <AppText variant="caption" style={{ color: included ? theme.colors.primary : theme.colors.subtext }}>
                  {member.displayName}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionLine}>
          <View style={styles.sectionCopy}>
            <AppText variant="label" muted>
              Split method
            </AppText>
            <AppText variant="caption" muted>
              {METHODS.find((item) => item.value === method)?.body}
            </AppText>
          </View>
          {method !== "equal" ? (
            <Button size="compact" variant="secondary" onPress={() => autofillDetails()} icon="sparkles-outline">
              Auto-fill
            </Button>
          ) : null}
        </View>
        <View style={styles.pills}>
          {METHODS.map((item) => (
            <CategoryPill key={item.value} label={item.label} selected={method === item.value} onPress={() => selectMethod(item.value)} />
          ))}
        </View>

        {method !== "equal" ? (
          <View style={styles.splitDetails}>
            {includedMembers.map((member) => {
              const input = splitInputs[member.id] ?? createDefaultInput();
              const value =
                method === "percentage" ? input.percentage : method === "shares" ? input.shares : input.amountMajor;
              const onChangeText =
                method === "percentage"
                  ? (percentage: string) => updateMemberInput(member.id, { percentage })
                  : method === "shares"
                    ? (shares: string) => updateMemberInput(member.id, { shares })
                    : (amountMajor: string) => updateMemberInput(member.id, { amountMajor });
              return (
                <View key={member.id} style={[styles.detailRow, { borderColor: theme.colors.border }]}>
                  <View style={styles.detailCopy}>
                    <AppText>{member.displayName}</AppText>
                    <AppText variant="caption" muted>
                      {valueLabel(method)}
                    </AppText>
                  </View>
                  <View style={styles.detailInput}>
                    <TextField
                      label={valueLabel(method)}
                      value={value}
                      onChangeText={onChangeText}
                      keyboardType={method === "shares" ? "number-pad" : "decimal-pad"}
                      placeholder={method === "percentage" ? "25" : method === "shares" ? "1" : "0"}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>

      <Card style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View>
            <AppText variant="subtitle">Split preview</AppText>
            <AppText variant="caption" muted>
              {methodLabel(method)} across {includedMembers.length} members
            </AppText>
          </View>
          {group ? <MoneyAmount amountMinor={amountMinor} currency={group.currency} size="subtitle" /> : null}
        </View>

        <View style={styles.previewTotal}>
          <AppText variant="caption" muted>
            Allocated
          </AppText>
          {group ? <MoneyAmount amountMinor={allocatedMinor} currency={group.currency} size="body" /> : null}
        </View>

        {validation.splits.map((split) => {
          const member = activeMembers.find((item) => item.id === split.memberId);
          return (
            <View key={split.memberId} style={styles.previewRow}>
              <AppText>{member?.displayName ?? "Unknown member"}</AppText>
              {group ? <MoneyAmount amountMinor={split.amountMinor} currency={group.currency} size="body" /> : null}
            </View>
          );
        })}

        {validation.errors.length > 0 ? (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerBorder }]}>
            {validation.errors.map((error) => (
              <AppText key={error} variant="caption" style={{ color: theme.colors.danger }}>
                {error}
              </AppText>
            ))}
          </View>
        ) : null}
      </Card>

      <Button disabled={!canSave} onPress={save} icon="checkmark-circle">
        Save split expense
      </Button>
    </Screen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  memberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  memberToggle: {
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  sectionLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs
  },
  splitDetails: {
    gap: spacing.sm
  },
  detailRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md
  },
  detailCopy: {
    gap: spacing.xs
  },
  detailInput: {
    minWidth: 0
  },
  previewCard: {
    gap: spacing.md
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  previewTotal: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  previewRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs
  },
  pressed: {
    opacity: 0.72
  }
});
