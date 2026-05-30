import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createTag, getTags, getTagsByExpense, type TagInput } from "@/features/tags/tagService";
import { useAppStore } from "@/store/app.store";

export const tagQueryKey = (userId: string, includeArchived = false) => ["tags", userId, includeArchived] as const;
export const expenseTagsQueryKey = (expenseId: string) => ["expense-tags", expenseId] as const;

export const useTags = (options: { includeArchived?: boolean } = {}) => {
  const profileId = useAppStore((state) => state.profile.id);
  const tags = useAppStore((state) => state.tags);
  const signature = tags.map((tag) => `${tag.id}:${tag.updatedAt}:${tag.deletedAt ?? ""}`).join("|");

  return useQuery({
    queryKey: [...tagQueryKey(profileId, options.includeArchived), signature],
    queryFn: async () => getTags(profileId, tags, options),
    enabled: Boolean(profileId)
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const addTag = useAppStore((state) => state.addTag);
  const profileId = useAppStore((state) => state.profile.id);

  return useMutation({
    mutationFn: async (data: TagInput) => createTag(profileId, data, useAppStore.getState().tags),
    onSuccess: (tag) => {
      addTag(tag);
      void queryClient.invalidateQueries({ queryKey: ["tags", profileId] });
    }
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  const updateTag = useAppStore((state) => state.updateTag);
  const profileId = useAppStore((state) => state.profile.id);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TagInput }) => updateTag(id, { name: data.name, color: data.color ?? "#0F766E" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags", profileId] });
    }
  });
};

export const useArchiveTag = () => {
  const queryClient = useQueryClient();
  const archiveTag = useAppStore((state) => state.archiveTag);
  const profileId = useAppStore((state) => state.profile.id);

  return useMutation({
    mutationFn: async (id: string) => archiveTag(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags", profileId] });
    }
  });
};

export const useExpenseTags = (expenseId: string) => {
  const tags = useAppStore((state) => state.tags);
  const expenseTags = useAppStore((state) => state.expenseTags);
  const signature = expenseTags.filter((item) => item.expenseId === expenseId).map((item) => item.tagId).join("|");

  return useQuery({
    queryKey: [...expenseTagsQueryKey(expenseId), signature],
    queryFn: async () => getTagsByExpense(expenseId, tags, expenseTags),
    enabled: Boolean(expenseId)
  });
};

export const useSetExpenseTags = () => {
  const queryClient = useQueryClient();
  const setExpenseTags = useAppStore((state) => state.setExpenseTags);

  return useMutation({
    mutationFn: async ({ expenseId, tagIds }: { expenseId: string; tagIds: string[] }) => setExpenseTags(expenseId, tagIds),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: expenseTagsQueryKey(variables.expenseId) });
    }
  });
};
