import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, View } from "react-native";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/lib/theme";
import { majorToMinor, minorToMajorInput, transactionFormSchema, type TransactionFormValues } from "@/schemas/transaction.schema";
import { categorizeTransaction } from "@/services/ai.service";
import { canUseFeature } from "@/services/entitlement.service";
import { useAppStore } from "@/store/app.store";
import type { TransactionType } from "@/types/domain";

interface TransactionFormScreenProps {
  type?: TransactionType;
  transactionId?: string;
}

export const TransactionFormScreen = ({ type, transactionId }: TransactionFormScreenProps) => {
  const router = useRouter();
  const state = useAppStore();
  const addTransaction = useAppStore((store) => store.addTransaction);
  const updateTransaction = useAppStore((store) => store.updateTransaction);
  const deleteTransaction = useAppStore((store) => store.deleteTransaction);
  const consumeFeatureUsage = useAppStore((store) => store.consumeFeatureUsage);
  const existingTransaction = transactionId ? state.transactions.find((transaction) => transaction.id === transactionId && !transaction.deletedAt) : undefined;
  const resolvedType = existingTransaction?.type ?? type ?? "expense";
  const categories = state.categories.filter((category) => category.kind === resolvedType);
  const defaultCategory = existingTransaction?.categoryId ?? categories[0]?.id ?? "";
  const defaultWallet = existingTransaction?.walletId ?? state.wallets[0]?.id ?? "";

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: resolvedType,
      amountMajor: existingTransaction ? minorToMajorInput(existingTransaction.amountMinor) : "",
      walletId: defaultWallet,
      categoryId: defaultCategory,
      merchant: existingTransaction?.merchant ?? "",
      note: existingTransaction?.note ?? "",
      occurredAt: existingTransaction?.occurredAt ?? new Date().toISOString()
    }
  });

  const selectedCategoryId = watch("categoryId");
  const selectedWalletId = watch("walletId");
  const isEditing = Boolean(existingTransaction);
  const title = isEditing
    ? resolvedType === "income"
      ? "Edit income"
      : "Edit expense"
    : resolvedType === "income"
      ? "Add income"
      : "Add expense";

  useEffect(() => {
    if (transactionId && !existingTransaction) {
      Alert.alert("Transaction unavailable", "This transaction was deleted or cannot be found.");
      router.back();
    }
  }, [existingTransaction, router, transactionId]);

  useEffect(() => {
    if (defaultWallet && !selectedWalletId) {
      setValue("walletId", defaultWallet, { shouldValidate: true });
    }
  }, [defaultWallet, selectedWalletId, setValue]);

  useEffect(() => {
    if (defaultCategory && !selectedCategoryId) {
      setValue("categoryId", defaultCategory, { shouldValidate: true });
    }
  }, [defaultCategory, selectedCategoryId, setValue]);

  const suggestCategory = async () => {
    const merchant = watch("merchant");
    if (!merchant || !canUseFeature(state.entitlement, "ai_categorization")) {
      Alert.alert("AI categorization", "Add a merchant and upgrade to Pro for AI categorization.");
      return;
    }

    try {
      const result = await categorizeTransaction(`${watch("amountMajor")} ${merchant}`);
      const category = state.categories.find((item) => item.name.toLowerCase() === result.category.toLowerCase());
      if (category) {
        setValue("categoryId", category.id);
        consumeFeatureUsage("ai_categorization");
      }
      Alert.alert("AI suggestion", `${result.category}: ${result.reason}`);
    } catch (error) {
      Alert.alert("AI unavailable", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const onSubmit = handleSubmit(
    (values) => {
      const amountMinor = majorToMinor(values.amountMajor, state.profile.currency);
      if (amountMinor <= 0) {
        Alert.alert("Invalid amount", "Amount must be greater than zero.");
        return;
      }

      const now = new Date().toISOString();
      if (existingTransaction) {
        updateTransaction({
          ...existingTransaction,
          walletId: values.walletId,
          categoryId: values.categoryId,
          type: values.type,
          amountMinor,
          currency: existingTransaction.currency,
          merchant: values.merchant || null,
          note: values.note || null,
          occurredAt: values.occurredAt,
          updatedAt: now,
          updatedBy: state.profile.id
        });
      } else {
        addTransaction({
          id: `txn-${Date.now()}`,
          ownerId: state.profile.id,
          walletId: values.walletId,
          categoryId: values.categoryId,
          type: values.type,
          amountMinor,
          currency: state.profile.currency,
          merchant: values.merchant || null,
          note: values.note || null,
          occurredAt: values.occurredAt,
          createdAt: now,
          updatedAt: now,
          createdBy: state.profile.id,
          updatedBy: state.profile.id
        });
      }
      router.back();
    },
    (formErrors) => {
      const message =
        formErrors.amountMajor?.message ??
        formErrors.walletId?.message ??
        formErrors.categoryId?.message ??
        "Review the form and try again.";
      Alert.alert(`Unable to save ${resolvedType}`, message);
    }
  );

  const confirmDelete = () => {
    if (!existingTransaction) {
      return;
    }

    Alert.alert("Delete transaction?", "This reverses the transaction from your wallet and monthly plan.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTransaction(existingTransaction.id);
          router.back();
        }
      }
    ]);
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">{title}</AppText>
        <AppText muted>Money is stored as integer minor units and reviewed before saving.</AppText>
      </View>
      <Card style={styles.form}>
        <Controller
          control={control}
          name="amountMajor"
          render={({ field: { value, onChange } }) => (
            <TextField label="Amount" value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="Enter amount" error={errors.amountMajor?.message} />
          )}
        />
        <Controller
          control={control}
          name="merchant"
          render={({ field: { value, onChange } }) => (
            <TextField
              label={resolvedType === "income" ? "Source" : "Merchant"}
              value={value}
              onChangeText={onChange}
              placeholder={resolvedType === "income" ? "Enter income source" : "Enter merchant"}
            />
          )}
        />
        <View style={styles.pills}>
          {categories.map((category) => (
            <CategoryPill key={category.id} label={category.name} selected={selectedCategoryId === category.id} onPress={() => setValue("categoryId", category.id)} />
          ))}
        </View>
        <Controller
          control={control}
          name="note"
          render={({ field: { value, onChange } }) => <TextField label="Note" value={value} onChangeText={onChange} placeholder="Optional" />}
        />
        {resolvedType === "expense" ? (
          <Button variant="secondary" onPress={suggestCategory} icon="pricetags-outline">
            Suggest category with AI
          </Button>
        ) : null}
        <Button onPress={onSubmit} loading={isSubmitting} icon="checkmark-circle">
          Save {resolvedType}
        </Button>
        {isEditing ? (
          <Button variant="danger" onPress={confirmDelete} icon="trash">
            Delete transaction
          </Button>
        ) : null}
      </Card>
    </Screen>
  );
};

export const AddExpenseScreen = () => <TransactionFormScreen type="expense" />;
export const AddIncomeScreen = () => <TransactionFormScreen type="income" />;
export const EditTransactionScreen = () => {
  const { transactionId } = useLocalSearchParams<{ transactionId?: string }>();
  return <TransactionFormScreen transactionId={transactionId} />;
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
