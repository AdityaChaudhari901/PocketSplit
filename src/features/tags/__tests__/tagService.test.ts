import { describe, expect, it } from "vitest";

import { archiveTag, createTag, getTagsByExpense, setExpenseTags } from "@/features/tags/tagService";
import type { ExpenseTag, Tag } from "@/types/domain";

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: "tag-1",
  ownerId: "user-1",
  name: "Office",
  color: "#0F766E",
  isArchived: false,
  createdAt: "2026-05-30T00:00:00.000Z",
  updatedAt: "2026-05-30T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const makeLink = (overrides: Partial<ExpenseTag> = {}): ExpenseTag => ({
  expenseId: "txn-1",
  tagId: "tag-1",
  createdAt: "2026-05-30T00:00:00.000Z",
  createdBy: "user-1",
  ...overrides
});

describe("tagService", () => {
  it("creates a tag with valid data", () => {
    const tag = createTag("user-1", { name: "Office", color: "#1769E0" }, []);
    expect(tag).toMatchObject({ ownerId: "user-1", name: "Office", color: "#1769E0" });
  });

  it("fails when creating a duplicate tag name", () => {
    expect(() => createTag("user-1", { name: "office" }, [makeTag()])).toThrow("already exists");
  });

  it("archives a tag when in use", () => {
    const result = archiveTag("tag-1", [makeTag()], "user-1", [makeLink()]);
    expect(result.wasInUse).toBe(true);
    expect(result.tag.isArchived).toBe(true);
  });

  it("replaces expense tags atomically", () => {
    const links = setExpenseTags("txn-1", ["tag-2", "tag-3", "tag-2"], [makeLink(), makeLink({ expenseId: "txn-2" })], "user-1");
    expect(links.filter((link) => link.expenseId === "txn-1").map((link) => link.tagId)).toEqual(["tag-2", "tag-3"]);
    expect(links.some((link) => link.expenseId === "txn-2")).toBe(true);
  });

  it("returns tags for one expense", () => {
    const tags = [makeTag(), makeTag({ id: "tag-2", name: "Trip" })];
    const links = [makeLink(), makeLink({ expenseId: "txn-2", tagId: "tag-2" })];
    expect(getTagsByExpense("txn-1", tags, links)).toEqual([tags[0]]);
  });
});
