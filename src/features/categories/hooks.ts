import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCategory, getCategories, type CategoryInput } from "@/features/categories/categoryService";
import { useAppStore } from "@/store/app.store";

export const categoryQueryKey = (userId: string, includeArchived = false) => ["categories", userId, includeArchived] as const;

export const useCategories = (options: { includeArchived?: boolean } = {}) => {
  const profileId = useAppStore((state) => state.profile.id);
  const categories = useAppStore((state) => state.categories);
  const signature = categories.map((category) => `${category.id}:${category.updatedAt}:${category.deletedAt ?? ""}`).join("|");

  return useQuery({
    queryKey: [...categoryQueryKey(profileId, options.includeArchived), signature],
    queryFn: async () => getCategories(profileId, categories, options),
    enabled: Boolean(profileId)
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const addCategory = useAppStore((state) => state.addCategory);
  const profileId = useAppStore((state) => state.profile.id);

  return useMutation({
    mutationFn: async (data: CategoryInput) => createCategory(profileId, data, useAppStore.getState().categories),
    onSuccess: (category) => {
      addCategory(category);
      void queryClient.invalidateQueries({ queryKey: ["categories", profileId] });
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const updateCategory = useAppStore((state) => state.updateCategory);
  const profileId = useAppStore((state) => state.profile.id);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryInput }) => {
      updateCategory(id, {
        name: data.name,
        color: data.color ?? "#1769E0",
        icon: data.icon ?? "pricetag",
        kind: data.kind ?? "expense"
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories", profileId] });
    }
  });
};

export const useArchiveCategory = () => {
  const queryClient = useQueryClient();
  const archiveCategory = useAppStore((state) => state.archiveCategory);
  const profileId = useAppStore((state) => state.profile.id);

  return useMutation({
    mutationFn: async (id: string) => archiveCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories", profileId] });
    }
  });
};
