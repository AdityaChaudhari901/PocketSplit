import { describe, expect, it } from "vitest";

import {
  archiveCategory,
  createCategory,
  deleteCategory,
  getCategories
} from "@/features/categories/categoryService";
import type { Category, Transaction } from "@/types/domain";

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-custom",
  ownerId: "user-1",
  name: "Groceries",
  kind: "expense",
  icon: "cart",
  color: "#1769E0",
  isSystem: false,
  isDefault: false,
  isArchived: false,
  createdAt: "2026-05-30T00:00:00.000Z",
  updatedAt: "2026-05-30T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const makeTransaction = (categoryId = "cat-custom"): Transaction => ({
  id: "txn-1",
  ownerId: "user-1",
  walletId: "wallet-1",
  categoryId,
  type: "expense",
  amountMinor: 5000,
  currency: "INR",
  occurredAt: "2026-05-30T00:00:00.000Z",
  createdAt: "2026-05-30T00:00:00.000Z",
  updatedAt: "2026-05-30T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1"
});

describe("categoryService", () => {
  it("creates a category with valid data", () => {
    const category = createCategory("user-1", { name: "Groceries", color: "#10B981", icon: "cart" }, []);
    expect(category).toMatchObject({ ownerId: "user-1", name: "Groceries", color: "#10B981", isSystem: false });
  });

  it("fails when creating a duplicate category name", () => {
    expect(() => createCategory("user-1", { name: "groceries" }, [makeCategory()])).toThrow("already exists");
  });

  it("fails with an empty name", () => {
    expect(() => createCategory("user-1", { name: "" }, [])).toThrow();
  });

  it("fails with a name exceeding 50 chars", () => {
    expect(() => createCategory("user-1", { name: "a".repeat(51) }, [])).toThrow();
  });

  it("archives a category when not in use", () => {
    const result = archiveCategory("cat-custom", [makeCategory()], "user-1", []);
    expect(result.wasInUse).toBe(false);
    expect(result.category.isArchived).toBe(true);
  });

  it("archives a category even when in use", () => {
    const result = archiveCategory("cat-custom", [makeCategory()], "user-1", [makeTransaction()]);
    expect(result.wasInUse).toBe(true);
    expect(result.category.deletedAt).toBeTruthy();
  });

  it("fails hard delete when category is in use", () => {
    expect(() => deleteCategory("cat-custom", [makeCategory()], [makeTransaction()])).toThrow("in use");
  });

  it("hard deletes a category when never used", () => {
    expect(deleteCategory("cat-custom", [makeCategory()], [])).toEqual([]);
  });

  it("fetch excludes archived categories by default", () => {
    expect(getCategories("user-1", [makeCategory({ isArchived: true, deletedAt: "2026-05-30T00:00:00.000Z" })])).toHaveLength(0);
  });

  it("fetch includes archived categories when requested", () => {
    expect(getCategories("user-1", [makeCategory({ isArchived: true, deletedAt: "2026-05-30T00:00:00.000Z" })], { includeArchived: true })).toHaveLength(1);
  });
});
