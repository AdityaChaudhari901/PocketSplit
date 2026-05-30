import { tagFormSchema } from "@/schemas/category.schema";
import type { ExpenseTag, Tag } from "@/types/domain";

export interface TagInput {
  name: string;
  color?: string;
}

export interface TagMutationResult {
  tags: Tag[];
  tag: Tag;
  wasInUse: boolean;
}

export interface TagQueryOptions {
  includeArchived?: boolean;
}

const DEFAULT_TAG_COLOR = "#0F766E";

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, " ");

/**
 * Checks whether a tag is archived through either the V1 flag or legacy soft-delete field.
 */
export const isTagArchived = (tag: Tag): boolean => Boolean(tag.isArchived || tag.deletedAt);

const assertUniqueTagName = (userId: string, tags: Tag[], name: string, ignoreId?: string): void => {
  const normalizedName = normalizeName(name).toLowerCase();
  const duplicate = tags.some(
    (tag) => tag.id !== ignoreId && tag.ownerId === userId && !isTagArchived(tag) && tag.name.trim().toLowerCase() === normalizedName
  );

  if (duplicate) {
    throw new Error("A tag with this name already exists.");
  }
};

const isTagInUse = (tagId: string, expenseTags: ExpenseTag[] = []): boolean => expenseTags.some((item) => item.tagId === tagId);

/**
 * Returns user tags, excluding archived tags by default.
 */
export const getTags = (userId: string, tags: Tag[] = [], options: TagQueryOptions = {}): Tag[] => {
  const includeArchived = options.includeArchived ?? false;
  return tags
    .filter((tag) => tag.ownerId === userId)
    .filter((tag) => includeArchived || !isTagArchived(tag))
    .sort((left, right) => left.name.localeCompare(right.name));
};

/**
 * Builds a validated tag for the current user.
 */
export const createTag = (userId: string, data: TagInput, tags: Tag[] = []): Tag => {
  const parsed = tagFormSchema.parse({
    name: data.name,
    color: data.color ?? DEFAULT_TAG_COLOR
  });
  const name = normalizeName(parsed.name);
  assertUniqueTagName(userId, tags, name);
  const now = new Date().toISOString();

  return {
    id: `tag-${Date.now()}`,
    ownerId: userId,
    name,
    color: parsed.color || DEFAULT_TAG_COLOR,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId
  };
};

/**
 * Updates a tag while preserving its creation metadata.
 */
export const updateTag = (id: string, data: TagInput, tags: Tag[], userId: string): TagMutationResult => {
  const existing = tags.find((tag) => tag.id === id);
  if (!existing) {
    throw new Error("Tag not found.");
  }

  const parsed = tagFormSchema.parse({
    name: data.name,
    color: data.color ?? existing.color
  });
  const name = normalizeName(parsed.name);
  assertUniqueTagName(userId, tags, name, id);

  const tag: Tag = {
    ...existing,
    name,
    color: parsed.color || existing.color,
    updatedAt: new Date().toISOString(),
    updatedBy: userId
  };

  return {
    tags: tags.map((item) => (item.id === id ? tag : item)),
    tag,
    wasInUse: false
  };
};

/**
 * Soft-archives a tag. Existing expense tag links are preserved for history.
 */
export const archiveTag = (id: string, tags: Tag[], userId: string, expenseTags: ExpenseTag[] = []): TagMutationResult => {
  const existing = tags.find((tag) => tag.id === id);
  if (!existing) {
    throw new Error("Tag not found.");
  }

  const now = new Date().toISOString();
  const tag: Tag = {
    ...existing,
    isArchived: true,
    deletedAt: now,
    updatedAt: now,
    updatedBy: userId
  };

  return {
    tags: tags.map((item) => (item.id === id ? tag : item)),
    tag,
    wasInUse: isTagInUse(id, expenseTags)
  };
};

/**
 * Hard-deletes a tag only when no expense references it.
 */
export const deleteTag = (id: string, tags: Tag[], expenseTags: ExpenseTag[] = []): Tag[] => {
  if (isTagInUse(id, expenseTags)) {
    throw new Error("Tag is in use. Archive it instead.");
  }

  return tags.filter((tag) => tag.id !== id);
};

/**
 * Returns all tags attached to a single expense.
 */
export const getTagsByExpense = (expenseId: string, tags: Tag[] = [], expenseTags: ExpenseTag[] = []): Tag[] => {
  const tagIds = new Set(expenseTags.filter((item) => item.expenseId === expenseId).map((item) => item.tagId));
  return tags.filter((tag) => tagIds.has(tag.id));
};

/**
 * Replaces tags for one expense as one deterministic local operation.
 */
export const setExpenseTags = (expenseId: string, tagIds: string[], existingLinks: ExpenseTag[] = [], actorId: string): ExpenseTag[] => {
  const uniqueTagIds = [...new Set(tagIds)];
  const now = new Date().toISOString();
  return [
    ...existingLinks.filter((item) => item.expenseId !== expenseId),
    ...uniqueTagIds.map((tagId) => ({
      expenseId,
      tagId,
      createdAt: now,
      createdBy: actorId
    }))
  ];
};
