import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/lib/theme";
import { majorToMinor } from "@/schemas/transaction.schema";
import { createSavingsGoal } from "@/services/savings-goal.service";
import { useAppStore } from "@/store/app.store";

const toDateInput = (date = new Date()): string => date.toISOString().slice(0, 10);

const parseDateInput = (value: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T09:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date.toISOString();
};

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const SavingsGoalFormScreen = () => {
  const router = useRouter();
  const state = useAppStore();
  const addSavingsGoal = useAppStore((store) => store.addSavingsGoal);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [targetDate, setTargetDate] = useState(toDateInput(new Date(Date.now() + 180 * 86_400_000)));
  const [note, setNote] = useState("");

  const save = () => {
    const targetAmountMinor = majorToMinor(targetAmount, state.profile.currency);
    const savedAmountMinor = savedAmount ? majorToMinor(savedAmount, state.profile.currency) : 0;
    const monthlyContributionMinor = majorToMinor(monthlyContribution, state.profile.currency);
    const parsedTargetDate = parseDateInput(targetDate);

    if (!name.trim()) {
      Alert.alert("Missing goal name", "Add a clear name for this savings goal.");
      return;
    }

    if (targetAmountMinor <= 0) {
      Alert.alert("Invalid target", "Target amount must be greater than zero.");
      return;
    }

    if (savedAmountMinor < 0 || savedAmountMinor > targetAmountMinor) {
      Alert.alert("Invalid saved amount", "Saved amount cannot be greater than the target.");
      return;
    }

    if (monthlyContributionMinor <= 0) {
      Alert.alert("Invalid monthly contribution", "Add the amount you want to reserve each month.");
      return;
    }

    if (!parsedTargetDate) {
      Alert.alert("Invalid target date", "Use YYYY-MM-DD so planning stays predictable.");
      return;
    }

    if (startOfDay(new Date(parsedTargetDate)) < startOfDay(new Date())) {
      Alert.alert("Invalid target date", "Target date cannot be in the past.");
      return;
    }

    try {
      addSavingsGoal(
        createSavingsGoal({
          ownerId: state.profile.id,
          name,
          targetAmountMinor,
          savedAmountMinor,
          currency: state.profile.currency,
          targetDate: parsedTargetDate,
          monthlyContributionMinor,
          note
        })
      );
      router.back();
    } catch (error) {
      Alert.alert("Unable to save goal", error instanceof Error ? error.message : "Please check the form and try again.");
    }
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Add savings goal</AppText>
        <AppText muted>Reserve money for future plans before calculating what is safe to spend today.</AppText>
      </View>

      <Card style={styles.card}>
        <TextField label="Goal name" value={name} onChangeText={setName} placeholder="Enter goal name" />
        <TextField label="Target amount" value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" placeholder="Enter target amount" />
        <TextField label="Already saved" value={savedAmount} onChangeText={setSavedAmount} keyboardType="decimal-pad" placeholder="Optional" />
        <TextField label="Monthly contribution" value={monthlyContribution} onChangeText={setMonthlyContribution} keyboardType="decimal-pad" placeholder="Enter monthly amount" />
        <TextField label="Target date" value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" />
        <TextField label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
        <Button icon="checkmark-circle" onPress={save}>
          Save savings goal
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
