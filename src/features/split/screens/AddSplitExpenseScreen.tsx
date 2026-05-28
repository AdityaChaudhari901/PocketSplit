import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/lib/theme";
import { majorToMinor } from "@/schemas/transaction.schema";
import { canUseFeature } from "@/services/entitlement.service";
import { createSplitExpense } from "@/services/split.service";
import { useAppStore } from "@/store/app.store";
import type { SplitMethod } from "@/types/domain";

const METHODS: SplitMethod[] = ["equal", "exact", "percentage", "shares", "itemwise", "custom"];

export const AddSplitExpenseScreen = () => {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const state = useAppStore();
  const addGroupExpense = useAppStore((store) => store.addGroupExpense);
  const group = state.groups.find((item) => item.id === groupId) ?? state.groups[0];
  const [title, setTitle] = useState("Hotel");
  const [amount, setAmount] = useState("4000");
  const [method, setMethod] = useState<SplitMethod>("equal");
  const [paidByMemberId, setPaidByMemberId] = useState(group?.members[0]?.id ?? "");

  const save = () => {
    if (!group) {
      Alert.alert("Create a group first", "Split expenses need a group.");
      return;
    }

    if (!canUseFeature(state.entitlement, "group_expense")) {
      Alert.alert("Group expense limit reached", "Upgrade for unlimited group expenses.");
      return;
    }

    if (method !== "equal" && !canUseFeature(state.entitlement, "advanced_split")) {
      Alert.alert("Advanced split is premium", "Free users can use equal split. Upgrade for exact, percentage, shares, item-wise, and custom splits.");
      return;
    }

    try {
      const expense = createSplitExpense({
        groupId: group.id,
        title,
        amountMinor: majorToMinor(amount, group.currency),
        currency: group.currency,
        paidByMemberId,
        splitMethod: method,
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
        <AppText muted>Financial history is append-first: edits should create new versions and activity records.</AppText>
      </View>
      <Card style={styles.form}>
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <AppText variant="label" muted>
          Paid by
        </AppText>
        <View style={styles.pills}>
          {group?.members.map((member) => (
            <CategoryPill key={member.id} label={member.displayName} selected={paidByMemberId === member.id} onPress={() => setPaidByMemberId(member.id)} />
          ))}
        </View>
        <AppText variant="label" muted>
          Split method
        </AppText>
        <View style={styles.pills}>
          {METHODS.map((item) => (
            <CategoryPill key={item} label={item} selected={method === item} onPress={() => setMethod(item)} />
          ))}
        </View>
        <Button onPress={save} icon="checkmark-circle">
          Save split expense
        </Button>
      </Card>
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
  }
});
