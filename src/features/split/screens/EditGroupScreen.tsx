import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { z } from "zod";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { spacing } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

const editGroupSchema = z.object({
  name: z.string().trim().min(2, "Group name is required.").max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(180, "Keep the description under 180 characters.").optional()
});

type EditGroupValues = z.infer<typeof editGroupSchema>;

export const EditGroupScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const group = useAppStore((state) => state.groups.find((item) => item.id === id && !item.deletedAt));
  const updateGroup = useAppStore((state) => state.updateGroup);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<EditGroupValues>({
    resolver: zodResolver(editGroupSchema),
    values: {
      name: group?.name ?? "",
      description: group?.description ?? ""
    }
  });

  if (!group) {
    return (
      <Screen>
        <EmptyState icon="alert-circle" title="Group not found" body="This group may have been deleted." />
      </Screen>
    );
  }

  const save = handleSubmit((values) => {
    updateGroup(group.id, values);
    router.back();
  });

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="hero">Edit group</AppText>
        <AppText muted>Update the group name and note shown to members.</AppText>
      </View>

      <Card style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => <TextField label="Group name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} placeholder="Goa trip" />}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => <TextField label="Description" value={field.value ?? ""} onChangeText={field.onChange} error={errors.description?.message} placeholder="Weekend trip, room split..." />}
        />
      </Card>

      <View style={styles.actions}>
        <Button variant="secondary" icon="close" onPress={() => router.back()}>
          Cancel
        </Button>
        <Button loading={isSubmitting} icon="checkmark-circle" onPress={save}>
          Save changes
        </Button>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs
  },
  form: {
    gap: spacing.md
  },
  actions: {
    gap: spacing.sm
  }
});
