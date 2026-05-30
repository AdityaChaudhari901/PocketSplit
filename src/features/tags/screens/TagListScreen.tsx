import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";

import { TagPill } from "@/components/tags/TagPill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useArchiveTag, useCreateTag, useTags, useUpdateTag } from "@/features/tags/hooks";
import { isTagArchived } from "@/features/tags/tagService";
import { spacing, useAppTheme } from "@/lib/theme";
import { tagFormSchema, type TagFormValues } from "@/schemas/category.schema";
import type { Tag } from "@/types/domain";

const COLOR_SWATCHES = ["#0F766E", "#1769E0", "#F97316", "#DB2777", "#7C3AED", "#475467"];

export const TagListScreen = () => {
  const theme = useAppTheme();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const tagsQuery = useTags({ includeArchived });
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const archiveTag = useArchiveTag();
  const tags = tagsQuery.data ?? [];

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { name: "", color: COLOR_SWATCHES[0] }
  });

  const selectedColor = watch("color") || COLOR_SWATCHES[0];
  const busy = isSubmitting || createTag.isPending || updateTag.isPending;

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    reset({ name: tag.name, color: tag.color });
  };

  const clearForm = () => {
    setEditingTag(null);
    reset({ name: "", color: COLOR_SWATCHES[0] });
  };

  const onSubmit = handleSubmit((values) => {
    if (editingTag) {
      updateTag.mutate(
        { id: editingTag.id, data: values },
        {
          onSuccess: clearForm,
          onError: (error) => Alert.alert("Unable to update tag", error instanceof Error ? error.message : "Please try again.")
        }
      );
      return;
    }

    createTag.mutate(values, {
      onSuccess: clearForm,
      onError: (error) => Alert.alert("Unable to create tag", error instanceof Error ? error.message : "Please try again.")
    });
  });

  const confirmArchive = (tag: Tag) => {
    Alert.alert("Archive tag?", `${tag.name} will be hidden from new expenses but remain on existing records.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: () =>
          archiveTag.mutate(tag.id, {
            onError: (error) => Alert.alert("Unable to archive tag", error instanceof Error ? error.message : "Please try again.")
          })
      }
    ]);
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Tags</AppText>
        <AppText muted>Add lightweight labels for search, reports, and export.</AppText>
      </View>

      <Card style={styles.form}>
        <AppText variant="subtitle">{editingTag ? "Edit tag" : "Create tag"}</AppText>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange } }) => <TextField label="Name" value={value} onChangeText={onChange} placeholder="office" error={errors.name?.message} />}
        />
        <View style={styles.section}>
          <AppText variant="label" muted>
            Color
          </AppText>
          <View style={styles.swatches}>
            {COLOR_SWATCHES.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityLabel={`Use ${color}`}
                onPress={() => setValue("color", color, { shouldValidate: true })}
                style={[styles.swatch, { backgroundColor: color, borderColor: selectedColor === color ? theme.colors.text : "transparent" }]}
              />
            ))}
          </View>
          {errors.color?.message ? (
            <AppText variant="caption" style={{ color: theme.colors.danger }}>
              {errors.color.message}
            </AppText>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button icon="checkmark-circle" loading={busy} onPress={onSubmit}>
            {editingTag ? "Save tag" : "Create tag"}
          </Button>
          {editingTag ? (
            <Button variant="secondary" onPress={clearForm}>
              Cancel edit
            </Button>
          ) : null}
        </View>
      </Card>

      <Card elevated={false} style={styles.toggleCard}>
        <View style={styles.toggleCopy}>
          <AppText variant="subtitle">View archived</AppText>
          <AppText muted>{tags.length} tags in this view.</AppText>
        </View>
        <Switch value={includeArchived} onValueChange={setIncludeArchived} />
      </Card>

      {tagsQuery.isLoading ? (
        <Card>
          <AppText muted>Loading tags...</AppText>
        </Card>
      ) : tags.length === 0 ? (
        <EmptyState icon="pricetag" title="No tags yet" body="Create tags like office, trip, reimbursable, or family." />
      ) : (
        tags.map((tag) => (
          <Card key={tag.id} elevated={false} style={isTagArchived(tag) ? styles.archivedTag : styles.tagCard}>
            <View style={styles.tagRow}>
              <TagPill tag={tag} muted={isTagArchived(tag)} />
              <View style={styles.tagActions}>
                <Button size="compact" variant="secondary" icon="create-outline" onPress={() => startEdit(tag)} disabled={isTagArchived(tag)}>
                  Edit
                </Button>
                {!isTagArchived(tag) ? (
                  <Button size="compact" variant="ghost" icon="archive-outline" onPress={() => confirmArchive(tag)}>
                    Archive
                  </Button>
                ) : null}
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: spacing.md
  },
  section: {
    gap: spacing.sm
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3
  },
  actions: {
    gap: spacing.sm
  },
  toggleCard: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  toggleCopy: {
    flex: 1
  },
  tagCard: {
    gap: spacing.sm
  },
  archivedTag: {
    opacity: 0.58
  },
  tagRow: {
    gap: spacing.md
  },
  tagActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
