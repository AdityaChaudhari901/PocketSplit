import { useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { spacing, useAppTheme } from "@/lib/theme";
import { majorToMinor } from "@/schemas/transaction.schema";
import { scheduleRecurringBillReminder } from "@/services/notification.service";
import { createRecurringBill } from "@/services/recurring-bill.service";
import { useAppStore } from "@/store/app.store";
import type { RecurringFrequency } from "@/types/domain";

const frequencies: { label: string; value: RecurringFrequency }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" }
];

const toDateInput = (date = new Date()): string => date.toISOString().slice(0, 10);

const parseDateInput = (value: string): string | null => {
  const match = value.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) {
    return null;
  }

  const date = new Date(`${value}T09:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const RecurringBillFormScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();
  const addRecurringBill = useAppStore((store) => store.addRecurringBill);
  const categories = state.categories.filter((category) => category.kind === "expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [nextDueDate, setNextDueDate] = useState(toDateInput(new Date(Date.now() + 3 * 86_400_000)));
  const [remindDaysBefore, setRemindDaysBefore] = useState("3");
  const [autoCreateExpense, setAutoCreateExpense] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  const save = () => {
    const amountMinor = majorToMinor(amount, state.profile.currency);
    const dueAt = parseDateInput(nextDueDate);
    const reminderDays = Number.parseInt(remindDaysBefore, 10);

    if (!name.trim()) {
      Alert.alert("Missing bill name", "Add a clear bill or subscription name.");
      return;
    }

    if (amountMinor <= 0) {
      Alert.alert("Invalid amount", "Amount must be greater than zero.");
      return;
    }

    if (!categoryId) {
      Alert.alert("Missing category", "Choose the category this bill belongs to.");
      return;
    }

    if (!dueAt) {
      Alert.alert("Invalid due date", "Use YYYY-MM-DD so reminders and recurrence stay predictable.");
      return;
    }

    if (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 30) {
      Alert.alert("Invalid reminder", "Reminder days must be between 0 and 30.");
      return;
    }

    try {
      const bill = createRecurringBill({
        ownerId: state.profile.id,
        name,
        amountMinor,
        currency: state.profile.currency,
        categoryId,
        walletId: state.wallets[0]?.id ?? null,
        frequency,
        nextDueAt: dueAt,
        remindDaysBefore: reminderDays,
        autoCreateExpense,
        merchant,
        note
      });
      addRecurringBill(bill);
      scheduleRecurringBillReminder(bill).catch(() => undefined);
      router.back();
    } catch (error) {
      Alert.alert("Unable to save bill", error instanceof Error ? error.message : "Please check the form and try again.");
    }
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Add recurring bill</AppText>
        <AppText muted>Track rent, EMIs, subscriptions, and fixed bills before they affect safe daily spend.</AppText>
      </View>

      <Card style={styles.card}>
        <TextField label="Bill name" value={name} onChangeText={setName} placeholder="Enter bill name" />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Enter amount" />
        <TextField label="Next due date" value={nextDueDate} onChangeText={setNextDueDate} placeholder="YYYY-MM-DD" />
        <TextField label="Reminder days before" value={remindDaysBefore} onChangeText={setRemindDaysBefore} keyboardType="number-pad" placeholder="Enter days" />

        <View style={styles.section}>
          <AppText variant="label" muted>
            Frequency
          </AppText>
          <View style={styles.pills}>
            {frequencies.map((item) => (
              <CategoryPill key={item.value} label={item.label} selected={frequency === item.value} onPress={() => setFrequency(item.value)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label" muted>
            Category
          </AppText>
          <View style={styles.pills}>
            {categories.map((category) => (
              <CategoryPill key={category.id} label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <AppText variant="subtitle">Auto-create expense</AppText>
            <AppText muted>When backend jobs are connected, create the expense on due date.</AppText>
          </View>
          <Switch
            value={autoCreateExpense}
            onValueChange={setAutoCreateExpense}
            trackColor={{ false: theme.colors.surfaceMuted, true: theme.colors.primarySoft }}
            thumbColor={autoCreateExpense ? theme.colors.primary : theme.colors.subtext}
          />
        </View>

        <TextField label="Merchant" value={merchant} onChangeText={setMerchant} placeholder="Optional" />
        <TextField label="Note" value={note} onChangeText={setNote} placeholder="Optional" />

        <Button icon="checkmark-circle" onPress={save}>
          Save recurring bill
        </Button>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  section: {
    gap: spacing.sm
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  switchCopy: {
    flex: 1
  }
});
