import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExportFilename,
  formatAsCSV,
  formatAsPDF,
  getExportData,
  type ExportContext,
  type ExportData
} from "@/features/export/exportService";
import type { Category, ExpenseTag, GroupExpense, Settlement, SplitGroup, Tag, Transaction } from "@/types/domain";

vi.mock("expo-print", () => ({
  printToFileAsync: vi.fn(async () => ({ uri: "file:///tmp/expenses.pdf" }))
}));

vi.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { UTF8: "utf8" },
  writeAsStringAsync: vi.fn(),
  copyAsync: vi.fn()
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn()
}));

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "txn-1",
  ownerId: "user-1",
  walletId: "wallet-1",
  categoryId: "cat-food",
  type: "expense",
  amountMinor: 123456,
  currency: "INR",
  merchant: "Cafe",
  note: "Lunch",
  occurredAt: "2026-05-10T10:00:00.000Z",
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-food",
  ownerId: "user-1",
  name: "Food",
  kind: "expense",
  icon: "restaurant",
  color: "#DC3E53",
  isSystem: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: "tag-team",
  ownerId: "user-1",
  name: "Team",
  color: "#1769E0",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

const group: SplitGroup = {
  id: "group-goa",
  name: "Goa Trip",
  type: "trip",
  currency: "INR",
  members: [
    { id: "member-user", userId: "user-1", displayName: "Aditya", role: "admin", isCurrentUser: true },
    { id: "member-friend", displayName: "Riya", role: "member" }
  ],
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1"
};

const groupExpense: GroupExpense = {
  id: "gexp-1",
  groupId: "group-goa",
  title: "Hotel booking",
  amountMinor: 1000000,
  currency: "INR",
  paidByMemberId: "member-user",
  splitMethod: "equal",
  occurredAt: "2026-05-12T10:00:00.000Z",
  splits: [
    { memberId: "member-user", amountMinor: 500000 },
    { memberId: "member-friend", amountMinor: 500000 }
  ],
  version: 1,
  createdAt: "2026-05-12T10:00:00.000Z",
  updatedAt: "2026-05-12T10:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1"
};

const settlement: Settlement = {
  id: "settlement-1",
  groupId: "group-goa",
  fromMemberId: "member-friend",
  toMemberId: "member-user",
  amountMinor: 500000,
  currency: "INR",
  status: "paid",
  createdAt: "2026-05-15T10:00:00.000Z",
  updatedAt: "2026-05-15T10:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1"
};

const context: ExportContext = {
  transactions: [
    makeTransaction({ id: "txn-food", merchant: 'Cafe, "Blue"', note: "Team lunch", categoryId: "cat-food", occurredAt: "2026-05-10T10:00:00.000Z" }),
    makeTransaction({ id: "txn-travel", merchant: "IndiGo", note: "Flights", categoryId: "cat-travel", amountMinor: 250000, occurredAt: "2026-05-20T10:00:00.000Z" }),
    makeTransaction({ id: "txn-june", merchant: "Books", categoryId: "cat-food", amountMinor: 50000, occurredAt: "2026-06-02T10:00:00.000Z" }),
    makeTransaction({ id: "txn-other-user", ownerId: "user-2", merchant: "Hidden", amountMinor: 999999, occurredAt: "2026-05-10T10:00:00.000Z" })
  ],
  categories: [makeCategory(), makeCategory({ id: "cat-travel", name: "Travel", color: "#1769E0" })],
  tags: [makeTag(), makeTag({ id: "tag-trip", name: "Trip", color: "#059669" })],
  expenseTags: [
    { expenseId: "txn-food", tagId: "tag-team", createdAt: "2026-05-10T10:00:00.000Z", createdBy: "user-1" },
    { expenseId: "txn-food", tagId: "tag-trip", createdAt: "2026-05-10T10:00:00.000Z", createdBy: "user-1" }
  ] satisfies ExpenseTag[],
  groups: [group],
  groupExpenses: [groupExpense],
  settlements: [settlement]
};

describe("exportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getExportData returns correct expenses for date range", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "csv", fromDate: "2026-05-01", toDate: "2026-05-31" }, context);
    expect(data.personalExpenses.map((expense) => expense.id)).toEqual(["txn-travel", "txn-food"]);
  });

  it("getExportData respects scope: personal vs group", async () => {
    const personal = await getExportData("user-1", { scope: "personal", format: "csv" }, context);
    const groupOnly = await getExportData("user-1", { scope: "group", format: "csv", groupId: "group-goa", includeSettlements: true }, context);

    expect(personal.personalExpenses.length).toBe(3);
    expect(personal.groupExpenses).toEqual([]);
    expect(groupOnly.personalExpenses).toEqual([]);
    expect(groupOnly.groupExpenses.map((expense) => expense.id)).toEqual(["gexp-1"]);
    expect(groupOnly.settlements.map((item) => item.id)).toEqual(["settlement-1"]);
  });

  it("getExportData respects category filter", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "csv", categoryIds: ["cat-travel"] }, context);
    expect(data.personalExpenses.map((expense) => expense.id)).toEqual(["txn-travel"]);
  });

  it("formatAsCSV produces a valid CSV string with required columns", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "csv", categoryIds: ["cat-food"], fromDate: "2026-05-01", toDate: "2026-05-31" }, context);
    const csv = formatAsCSV(data);
    expect(csv.split("\n")[0]).toBe("Date,Type,Category,Tags,Merchant/Description,Amount,Currency,Note");
  });

  it("formatAsCSV handles special characters in merchant name", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "csv", categoryIds: ["cat-food"], fromDate: "2026-05-01", toDate: "2026-05-31" }, context);
    expect(formatAsCSV(data)).toContain('"Cafe, ""Blue"""');
  });

  it("formatAsCSV formats amounts as human-readable values", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "csv", categoryIds: ["cat-food"], fromDate: "2026-05-01", toDate: "2026-05-31" }, context);
    const csv = formatAsCSV(data);
    expect(csv).toContain("1234.56");
    expect(csv).not.toContain("123456");
  });

  it("formatAsCSV formats dates as YYYY-MM-DD", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "csv", categoryIds: ["cat-travel"] }, context);
    expect(formatAsCSV(data)).toContain("2026-05-20");
  });

  it("formatAsCSV handles empty data with header row only", () => {
    const emptyData: ExportData = {
      scope: "personal",
      generatedAt: "2026-05-30T00:00:00.000Z",
      personalExpenses: [],
      groupExpenses: [],
      settlements: [],
      summary: { totalIncomeMinor: 0, totalExpenseMinor: 0, netMinor: 0, transactionCount: 0 }
    };

    expect(formatAsCSV(emptyData).trim()).toBe("Date,Type,Category,Tags,Merchant/Description,Amount,Currency,Note");
  });

  it("formatAsCSV tags field is comma-separated string", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "csv", categoryIds: ["cat-food"], fromDate: "2026-05-01", toDate: "2026-05-31" }, context);
    expect(formatAsCSV(data)).toContain('"Team, Trip"');
  });

  it("formatAsPDF returns a local file URI", async () => {
    const data = await getExportData("user-1", { scope: "personal", format: "pdf" }, context);
    await expect(formatAsPDF(data, { scope: "personal", format: "pdf" })).resolves.toBe("file:///tmp/expenses.pdf");
  });

  it("filename follows YYYYMMDD_HHMMSS convention", () => {
    expect(createExportFilename("csv", new Date("2026-05-30T07:08:09.000Z"))).toMatch(/^expenses_20260530_\d{6}\.csv$/);
  });
});
