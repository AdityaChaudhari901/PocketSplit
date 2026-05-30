import { describe, expect, it } from "vitest";

import { categoryFormSchema, tagFormSchema } from "@/schemas/category.schema";

describe("category and tag validation", () => {
  it("rejects empty names", () => {
    expect(categoryFormSchema.safeParse({ name: "", color: "#1769E0", icon: "cart", kind: "expense" }).success).toBe(false);
    expect(tagFormSchema.safeParse({ name: "", color: "#1769E0" }).success).toBe(false);
  });

  it("rejects names over 50 chars", () => {
    expect(categoryFormSchema.safeParse({ name: "a".repeat(51), color: "#1769E0", icon: "cart", kind: "expense" }).success).toBe(false);
  });

  it("rejects invalid color hex values", () => {
    expect(categoryFormSchema.safeParse({ name: "Groceries", color: "blue", icon: "cart", kind: "expense" }).success).toBe(false);
    expect(tagFormSchema.safeParse({ name: "Office", color: "#12" }).success).toBe(false);
  });
});
