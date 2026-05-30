import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Controller, useForm } from "react-hook-form";

import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useGroupInviteDraftStore } from "@/features/split/groupInviteDraftStore";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { majorToMinor } from "@/schemas/transaction.schema";
import { createGroupSchema, type CreateGroupValues } from "@/schemas/split.schema";
import { canUseFeature } from "@/services/entitlement.service";
import { useAppStore } from "@/store/app.store";
import type { CurrencyCode, SplitGroupType } from "@/types/domain";

export const CreateGroupScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const state = useAppStore();
  const addGroup = useAppStore((store) => store.addGroup);
  const clearInviteDraft = useGroupInviteDraftStore((store) => store.clearMembers);
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
      membersCsv: ""
    }
  });

  const onSubmit = handleSubmit((values) => {
    if (!canUseFeature(state.entitlement, "split_group")) {
      return;
    }

    const now = new Date().toISOString();
    const currency = values.currency as CurrencyCode;
    const timestamp = Date.now();
    const groupId = `group-${timestamp}`;

    addGroup({
      id: groupId,
      name: values.name,
      description: values.description || null,
      type: values.type as SplitGroupType,
      currency,
      budgetMinor: values.budgetMajor ? majorToMinor(values.budgetMajor, currency) : null,
      members: [
        {
          id: `member-${timestamp}-you`,
          userId: state.profile.id,
          displayName: state.profile.displayName,
          role: "admin",
          isCurrentUser: true
        }
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: state.profile.id,
      updatedBy: state.profile.id
    });
    clearInviteDraft();
    router.replace(`/modals/add-group-members?groupId=${groupId}&next=split`);
  });

  const canCreateGroup = canUseFeature(state.entitlement, "split_group");

  return (
    <Screen contentStyle={styles.screenContent}>
      <View>
        <AppText variant="hero">Create group</AppText>
        <AppText muted>Create the group first, then add members and split the first bill.</AppText>
      </View>

      <Card style={styles.form}>
        <View style={styles.cardHeader}>
          <Ionicons name="reader-outline" size={22} color={theme.colors.primary} />
          <View style={styles.cardHeaderCopy}>
            <AppText variant="subtitle">Group details</AppText>
            <AppText variant="caption" muted>
              Name the group and add a short note.
            </AppText>
          </View>
        </View>
        <Controller
          control={control}
          name="name"
          render={({ field }) => <TextField label="Group name" value={field.value} onChangeText={field.onChange} error={errors.name?.message} placeholder="Goa trip" />}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => <TextField label="Description" value={field.value} onChangeText={field.onChange} placeholder="Weekend trip, room split, office lunch..." />}
        />
      </Card>

      {!canCreateGroup ? (
        <Card style={styles.limitCard}>
          <AppText variant="subtitle">Group limit reached</AppText>
          <AppText muted>Free users can create up to 2 split groups. Upgrade for unlimited groups.</AppText>
        </Card>
      ) : null}

      <CreateGroupButton disabled={!canCreateGroup || isSubmitting} loading={isSubmitting} onPress={onSubmit} />
    </Screen>
  );
};

const CreateGroupButton = ({ disabled, loading, onPress }: { disabled?: boolean; loading?: boolean; onPress: () => void }) => {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.ctaPressable, { opacity: disabled ? 0.5 : pressed ? 0.84 : 1 }]}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.aiStart, theme.colors.aiEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaGradient}
      >
        <View style={styles.ctaIcon}>
          <Ionicons name={loading ? "hourglass-outline" : "people"} size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.ctaCopy}>
          <AppText variant="subtitle" style={{ color: theme.colors.onPrimary }}>
            {loading ? "Creating group..." : "Create group"}
          </AppText>
          <AppText variant="caption" style={{ color: theme.colors.onPrimary }} numberOfLines={1}>
            Add members next
          </AppText>
        </View>
        <Ionicons name="arrow-forward" size={22} color={theme.colors.onPrimary} />
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 120
  },
  form: {
    gap: spacing.md
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  cardHeaderCopy: {
    flex: 1,
    gap: spacing.xs
  },
  limitCard: {
    gap: spacing.xs
  },
  ctaPressable: {
    borderRadius: radius.lg
  },
  ctaGradient: {
    minHeight: 72,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 6
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  ctaCopy: {
    flex: 1,
    minWidth: 0
  }
});
