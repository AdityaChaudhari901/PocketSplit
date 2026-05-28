import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { BudgetProgressCard } from "@/components/cards/BudgetProgressCard";
import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { monthKey } from "@/lib/dates";
import { calculateBudgetUsage } from "@/lib/money";
import { spacing } from "@/lib/theme";
import { majorToMinor } from "@/schemas/transaction.schema";
import { useAppStore } from "@/store/app.store";

export const BudgetPlannerScreen = () => {
  const state = useAppStore();
  const addBudget = useAppStore((store) => store.addBudget);
  const categories = state.categories.filter((category) => category.kind === "expense");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");

  const save = () => {
    const amountMinor = majorToMinor(amount, state.profile.currency);
    if (!categoryId || amountMinor <= 0) {
      Alert.alert("Invalid budget", "Choose a category and enter a positive amount.");
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
      <View>
        <AppText variant="hero">Budget planner</AppText>
        <AppText muted>Create monthly guardrails that drive Money Pulse and safe daily spend.</AppText>
      </View>
      <Card style={styles.card}>
        <TextField label="Budget amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Enter budget amount" />
        <View style={styles.pills}>
          {categories.map((category) => (
            <CategoryPill key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
          ))}
        </View>
        <Button onPress={save} icon="checkmark-circle">
          Save budget
        </Button>
      </Card>
      {state.budgets.map((budget) => (
        <BudgetProgressCard
          key={budget.id}
          usage={calculateBudgetUsage(state.getCategorySpend(budget.categoryId, budget.month), budget.amountMinor)}
          category={state.categories.find((category) => category.id === budget.categoryId) ?? categories[0]!}
          currency={budget.currency}
        />
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
