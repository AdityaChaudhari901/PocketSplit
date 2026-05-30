import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/lib/theme";
import { getSimplifiedSettlementPlan } from "@/services/split.service";
import { useAppStore } from "@/store/app.store";

export const PaymentProofScreen = () => {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const state = useAppStore();
  const addSettlement = useAppStore((store) => store.addSettlement);
  const group = state.groups.find((item) => item.id === groupId) ?? state.groups[0];
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    if (!group) {
      Alert.alert("No group", "Create a group before recording a settlement.");
      return;
    }
    const payment = getSimplifiedSettlementPlan({
      expenses: state.getGroupExpenses(group.id),
      members: group.members,
      currency: group.currency
    })[0];
    if (!payment) {
      Alert.alert("All settled", "There is no payment to record.");
      return;
    }
    const now = new Date().toISOString();
    addSettlement({
      id: `settlement-${Date.now()}`,
      groupId: group.id,
      fromMemberId: payment.fromMemberId,
      toMemberId: payment.toMemberId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      status: "paid",
      paymentReference: reference || null,
      note: note || null,
      createdAt: now,
      updatedAt: now,
      createdBy: state.profile.id,
      updatedBy: state.profile.id
    });
    Alert.alert("Payment recorded", "The payment is marked as paid and ready for member confirmation.");
    router.back();
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Payment proof</AppText>
        <AppText muted>Add a reference, note, or screenshot metadata. Real money movement is intentionally out of scope for MVP.</AppText>
      </View>
      <Card style={styles.card}>
        <TextField label="Reference ID" value={reference} onChangeText={setReference} placeholder="Optional" />
        <TextField label="Note" value={note} onChangeText={setNote} placeholder="Cash paid, screenshot uploaded, etc." />
        <Button onPress={save} icon="checkmark-circle">
          Mark as paid
        </Button>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  }
});
