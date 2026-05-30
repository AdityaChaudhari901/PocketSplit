import { categoryFormSchema } from "@/schemas/category.schema";
import type { Category, Transaction } from "@/types/domain";

export interface CategoryInput {
  name: string;
  color?: string;
  icon?: string;
  kind?: Category["kind"];
}

export interface CategoryMutationResult {
  categories: Category[];
  category: Category;
  wasInUse: boolean;
}

export interface CategoryQueryOptions {
  includeArchived?: boolean;
}

const DEFAULT_CATEGORY_COLOR = "#1769E0";
const DEFAULT_CATEGORY_ICON = "pricetag";

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, " ");

/**
 * Checks whether a category is archived through either the V1 flag or legacy soft-delete field.
 */
export const isCategoryArchived = (category: Category): boolean => Boolean(category.isArchived || category.deletedAt);

const isCategoryVisibleToUser = (category: Category, userId: string): boolean =>
  category.ownerId === userId || category.isSystem || Boolean(category.isDefault);

const assertUniqueCategoryName = (userId: string, categories: Category[], name: string, ignoreId?: string): void => {
  const normalizedName = normalizeName(name).toLowerCase();
  const duplicate = categories.some(
    (category) =>
      category.id !== ignoreId &&
      isCategoryVisibleToUser(category, userId) &&
      !isCategoryArchived(category) &&
      category.name.trim().toLowerCase() === normalizedName
  );

  if (duplicate) {
    throw new Error("A category with this name already exists.");
  }
};

const isCategoryInUse = (categoryId: string, transactions: Transaction[] = []): boolean =>
  transactions.some((transaction) => transaction.categoryId === categoryId && !transaction.deletedAt);

/**
 * Returns active categories visible to the user, with default/system categories first.
 */
export const getCategories = (userId: string, categories: Category[] = [], options: CategoryQueryOptions = {}): Category[] => {
  const includeArchived = options.includeArchived ?? false;
  return categories
    .filter((category) => isCategoryVisibleToUser(category, userId))
    .filter((category) => includeArchived || !isCategoryArchived(category))
    .sort((left, right) => {
      const leftDefault = left.isSystem || left.isDefault;
      const rightDefault = right.isSystem || right.isDefault;
      if (leftDefault !== rightDefault) {
        return leftDefault ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
};

/**
 * Builds a validated custom category for the current user.
 */
export const createCategory = (userId: string, data: CategoryInput, categories: Category[] = []): Category => {
  const parsed = categoryFormSchema.parse({
    name: data.name,
    color: data.color ?? DEFAULT_CATEGORY_COLOR,
    icon: data.icon ?? DEFAULT_CATEGORY_ICON,
    kind: data.kind ?? "expense"
  });
  const name = normalizeName(parsed.name);
  assertUniqueCategoryName(userId, categories, name);
  const now = new Date().toISOString();

  return {
    id: `cat-custom-${Date.now()}`,
    ownerId: userId,
    name,
    kind: parsed.kind,
    icon: parsed.icon,
    color: parsed.color || DEFAULT_CATEGORY_COLOR,
    isSystem: false,
    isDefault: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId
  };
};

/**
 * Updates a custom category while preserving ownership and creation metadata.
 */
export const updateCategory = (id: string, data: CategoryInput, categories: Category[], userId: string): CategoryMutationResult => {
  const existing = categories.find((category) => category.id === id);
  if (!existing) {
    throw new Error("Category not found.");
  }
  if (existing.isSystem || existing.isDefault) {
    throw new Error("Default categories cannot be edited.");
  }

  const parsed = categoryFormSchema.parse({
    name: data.name,
    color: data.color ?? existing.color,
    icon: data.icon ?? existing.icon,
    kind: data.kind ?? existing.kind
  });
  const name = normalizeName(parsed.name);
  assertUniqueCategoryName(userId, categories, name, id);

  const category: Category = {
    ...existing,
    name,
    kind: parsed.kind,
    color: parsed.color || existing.color,
    icon: parsed.icon,
    updatedAt: new Date().toISOString(),
    updatedBy: userId
  };

  return {
    categories: categories.map((item) => (item.id === id ? category : item)),
    category,
    wasInUse: false
  };
};

/**
 * Soft-archives a category. In-use categories stay attached to historical expenses.
 */
export const archiveCategory = (
  id: string,
  categories: Category[],
  userId: string,
  transactions: Transaction[] = []
): CategoryMutationResult => {
  const existing = categories.find((category) => category.id === id);
  if (!existing) {
    throw new Error("Category not found.");
  }
  if (existing.isSystem || existing.isDefault) {
    throw new Error("Default categories cannot be archived.");
  }

  const now = new Date().toISOString();
  const category: Category = {
    ...existing,
    isArchived: true,
    deletedAt: now,
    updatedAt: now,
    updatedBy: userId
  };

  return {
    categories: categories.map((item) => (item.id === id ? category : item)),
    category,
    wasInUse: isCategoryInUse(id, transactions)
  };
};

/**
 * Hard-deletes a category only when no active transaction references it.
 */
export const deleteCategory = (id: string, categories: Category[], transactions: Transaction[] = []): Category[] => {
  const existing = categories.find((category) => category.id === id);
  if (!existing) {
    throw new Error("Category not found.");
  }
  if (existing.isSystem || existing.isDefault) {
    throw new Error("Default categories cannot be deleted.");
  }
  if (isCategoryInUse(id, transactions)) {
    throw new Error("Category is in use. Archive it instead.");
  }

  return categories.filter((category) => category.id !== id);
};
