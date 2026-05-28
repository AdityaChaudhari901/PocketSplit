import { describe, expect, it } from "vitest";

import {
  addFrequency,
  createRecurringBill,
  getExpectedBillsMinorForMonth,
  getUpcomingBills,
  markRecurringBillPaid
} from "@/services/recurring-bill.service";
import type { RecurringBill } from "@/types/domain";

const bill = (overrides: Partial<RecurringBill> = {}): RecurringBill => ({
  id: "bill-rent",
  ownerId: "user-1",
  name: "Rent",
  amountMinor: 3200000,
  currency: "INR",
  categoryId: "cat-rent",
  walletId: "wallet-upi",
  frequency: "monthly",
  nextDueAt: "2026-05-05T00:00:00.000Z",
  remindDaysBefore: 3,
  autoCreateExpense: false,
  status: "active",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  createdBy: "user-1",
  updatedBy: "user-1",
  ...overrides
});

describe("recurring bill service", () => {
  it("creates a normalized recurring bill", () => {
    expect(
      createRecurringBill(
        {
          ownerId: "user-1",
          name: "  Internet  ",
          amountMinor: 120000,
          currency: "INR",
          categoryId: "cat-bills",
          frequency: "monthly",
          nextDueAt: "2026-05-15",
          remindDaysBefore: 2,
          autoCreateExpense: true
        },
        "bill-internet"
      )
    ).toMatchObject({
      id: "bill-internet",
      name: "Internet",
      amountMinor: 120000,
      status: "active",
      autoCreateExpense: true
    });
  });

  it("clamps monthly due dates to the end of shorter months", () => {
    expect(addFrequency(new Date("2026-01-31T00:00:00.000Z"), "monthly").toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("returns overdue and upcoming bills in due-date order", () => {
    const upcoming = getUpcomingBills(
      [
        bill({ id: "bill-later", nextDueAt: "2026-05-20T00:00:00.000Z" }),
        bill({ id: "bill-overdue", nextDueAt: "2026-05-01T00:00:00.000Z" }),
        bill({ id: "bill-paused", status: "paused", nextDueAt: "2026-05-02T00:00:00.000Z" })
      ],
      { today: new Date("2026-05-03T12:00:00.000Z"), horizonDays: 30 }
    );

    expect(upcoming.map((item) => item.bill.id)).toEqual(["bill-overdue", "bill-later"]);
    expect(upcoming[0]?.isOverdue).toBe(true);
  });

  it("sums active bills due in the current month", () => {
    expect(
      getExpectedBillsMinorForMonth(
        [
          bill({ amountMinor: 100000, nextDueAt: "2026-05-02T00:00:00.000Z" }),
          bill({ amountMinor: 200000, nextDueAt: "2026-06-02T00:00:00.000Z" }),
          bill({ amountMinor: 300000, status: "cancelled", nextDueAt: "2026-05-08T00:00:00.000Z" })
        ],
        new Date("2026-05-03T00:00:00.000Z")
      )
    ).toBe(100000);
  });

  it("marks a bill paid and advances the next due date", () => {
    expect(markRecurringBillPaid(bill(), new Date("2026-05-04T00:00:00.000Z"))).toMatchObject({
      lastPaidAt: "2026-05-04T00:00:00.000Z",
      nextDueAt: "2026-06-05T00:00:00.000Z"
    });
  });
});
