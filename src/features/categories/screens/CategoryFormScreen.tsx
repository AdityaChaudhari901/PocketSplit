import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CategoryPill } from "@/components/forms/CategoryPill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useCategories, useCreateCategory, useUpdateCategory } from "@/features/categories/hooks";
import { categoryFormSchema, type CategoryFormValues } from "@/schemas/category.schema";
import { spacing, useAppTheme } from "@/lib/theme";

const COLOR_SWATCHES = ["#1769E0", "#0EA5E9", "#10B981", "#F97316", "#DB2777", "#7C3AED", "#475467", "#C2410C"];
const ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = ["pricetag", "wallet", "receipt", "restaurant", "home", "airplane", "cart", "film-outline"];

interface CategoryFormScreenProps {
  categoryId?: string;
}

export const CategoryFormScreen = ({ categoryId }: CategoryFormScreenProps) => {
  const router = useRouter();
  const theme = useAppTheme();
  const categoriesQuery = useCategories({ includeArchived: true });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const existingCategory = categoryId ? categoriesQuery.data?.find((category) => category.id === categoryId) : undefined;
  const isEditing = Boolean(categoryId);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    values: {
      name: existingCategory?.name ?? "",
      color: existingCategory?.color ?? COLOR_SWATCHES[0],
      icon: existingCategory?.icon ?? "pricetag",
      kind: existingCategory?.kind ?? "expense"
    }
  });

  const selectedColor = watch("color") || COLOR_SWATCHES[0];
  const selectedIcon = watch("icon") as keyof typeof Ionicons.glyphMap;
  const selectedKind = watch("kind");
  const disabled = isSubmitting || createCategory.isPending || updateCategory.isPending;

  const onSubmit = handleSubmit((values) => {
    const payload = {
      name: values.name,
      color: values.color || COLOR_SWATCHES[0],
      icon: values.icon,
      kind: values.kind
    };

    if (isEditing && categoryId) {
      updateCategory.mutate(
        { id: categoryId, data: payload },
        {
          onSuccess: () => router.back(),
          onError: (error) => Alert.alert("Unable to update category", error instanceof Error ? error.message : "Please try again.")
        }
      );
      return;
    }

    createCategory.mutate(payload, {
      onSuccess: () => router.back(),
      onError: (error) => Alert.alert("Unable to create category", error instanceof Error ? error.message : "Please try again.")
    });
  });

  if (isEditing && categoriesQuery.isLoading) {
    return (
      <Screen>
        <Card>
          <AppText muted>Loading category...</AppText>
        </Card>
      </Screen>
    );
  }

  if (isEditing && !existingCategory) {
    return (
      <Screen>
        <Card>
          <AppText variant="subtitle">Category unavailable</AppText>
          <AppText muted>This category may have been deleted or is not available locally.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <AppText variant="hero">{isEditing ? "Edit category" : "New category"}</AppText>
        <AppText muted>Names support letters, numbers, spaces, dash, and underscore.</AppText>
      </View>

      <Card style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange } }) => <TextField label="Name" value={value} onChangeText={onChange} placeholder="Groceries" error={errors.name?.message} />}
        />

        <View style={styles.section}>
          <AppText variant="label" muted>
            Type
          </AppText>
          <View style={styles.pills}>
            {(["expense", "income"] as const).map((kind) => (
              <CategoryPill key={kind} label={kind} selected={selectedKind === kind} onPress={() => setValue("kind", kind, { shouldValidate: true })} />
            ))}
          </View>
        </View>

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

        <View style={styles.section}>
          <AppText variant="label" muted>
            Icon
          </AppText>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((icon) => (
              <Pressable
                key={icon}
                accessibilityRole="button"
                accessibilityLabel={`Use ${icon}`}
                accessibilityState={{ selected: selectedIcon === icon }}
                onPress={() => setValue("icon", icon, { shouldValidate: true })}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: selectedIcon === icon ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                    borderColor: selectedIcon === icon ? theme.colors.primary : theme.colors.border
                  }
                ]}
              >
                <Ionicons name={icon} size={20} color={selectedIcon === icon ? theme.colors.primary : theme.colors.text} />
              </Pressable>
            ))}
          </View>
        </View>

        <Button icon="checkmark-circle" loading={disabled} onPress={onSubmit}>
          {isEditing ? "Save category" : "Create category"}
        </Button>
      </Card>
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
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});
