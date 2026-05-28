import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/lib/theme";
import { majorToMinor } from "@/schemas/transaction.schema";
import { createGroupSchema, type CreateGroupValues } from "@/schemas/split.schema";
import { canUseFeature } from "@/services/entitlement.service";
import { useAppStore } from "@/store/app.store";
import type { CurrencyCode, SplitGroupType } from "@/types/domain";

export const CreateGroupScreen = () => {
  const router = useRouter();
  const state = useAppStore();
  const addGroup = useAppStore((store) => store.addGroup);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "trip",
      currency: state.profile.currency,
      budgetMajor: "",
      membersCsv: "Amit, Priya, Neha"
    }
  });

  const onSubmit = handleSubmit((values) => {
    if (!canUseFeature(state.entitlement, "split_group")) {
      Alert.alert("Group limit reached", "Free users can create up to 2 split groups. Upgrade for unlimited groups.");
      return;
    }

    const now = new Date().toISOString();
    const names = values.membersCsv
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const currency = values.currency as CurrencyCode;

    addGroup({
      id: `group-${Date.now()}`,
      name: values.name,
      description: values.description || null,
      type: values.type as SplitGroupType,
      currency,
      budgetMinor: values.budgetMajor ? majorToMinor(values.budgetMajor, currency) : null,
      members: [
        { id: `member-${Date.now()}-you`, userId: state.profile.id, displayName: state.profile.displayName, role: "admin", isCurrentUser: true },
        ...names.map((name, index) => ({ id: `member-${Date.now()}-${index}`, displayName: name, role: "member" as const }))
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: state.profile.id,
      updatedBy: state.profile.id
    });
    router.back();
  });

  return (
    <Screen>
      <View>
        <AppText variant="hero">Create group</AppText>
        <AppText muted>For trips, flatmates, family budgets, office lunches, and shared events.</AppText>
      </View>
      <Card style={styles.form}>
        <Controller control={control} name="name" render={({ field }) => <TextField label="Group name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />} />
        <Controller control={control} name="description" render={({ field }) => <TextField label="Description" value={field.value} onChangeText={field.onChange} />} />
        <Controller control={control} name="membersCsv" render={({ field }) => <TextField label="Members" value={field.value} onChangeText={field.onChange} error={errors.membersCsv?.message} />} />
        <Controller control={control} name="budgetMajor" render={({ field }) => <TextField label="Optional group budget" value={field.value} onChangeText={field.onChange} keyboardType="decimal-pad" />} />
        <Button onPress={onSubmit} loading={isSubmitting} icon="people">
          Create group
        </Button>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  }
});
