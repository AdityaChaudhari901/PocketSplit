import { describe, expect, it } from "vitest";

import { calculateExpenseShares, calculateGroupBalances, simplifySettlements, validateSplit } from "@/lib/split";
import type { GroupExpense, SplitMember } from "@/types/domain";

const members: SplitMember[] = [
  { id: "rahul", displayName: "Rahul", role: "admin" },
  { id: "amit", displayName: "Amit", role: "member" },
  { id: "priya", displayName: "Priya", role: "member" },
  { id: "neha", displayName: "Neha", role: "member" }
];

describe("split utilities", () => {
  it("creates an equal split without losing minor units", () => {
    expect(calculateExpenseShares({ amountMinor: 400000, method: "equal", memberIds: members.map((member) => member.id) })).toEqual([
      { memberId: "rahul", amountMinor: 100000 },
      { memberId: "amit", amountMinor: 100000 },
      { memberId: "priya", amountMinor: 100000 },
      { memberId: "neha", amountMinor: 100000 }
    ]);
  });

  it("rejects percentage splits that do not total 100 percent", () => {
    const result = validateSplit({
      amountMinor: 100000,
      method: "percentage",
      memberIds: ["rahul", "amit"],
      drafts: [
        { memberId: "rahul", percentageBps: 6000 },
        { memberId: "amit", percentageBps: 3000 }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Percentages must total 100%.");
  });

  it("calculates group balances for a payer and participants", () => {
    const expense: GroupExpense = {
      id: "expense",
      groupId: "group",
      title: "Hotel",
      amountMinor: 400000,
      currency: "INR",
      paidByMemberId: "rahul",
      splitMethod: "equal",
      occurredAt: "2026-05-01T00:00:00.000Z",
      splits: [
        { memberId: "rahul", amountMinor: 100000 },
        { memberId: "amit", amountMinor: 100000 },
        { memberId: "priya", amountMinor: 100000 },
        { memberId: "neha", amountMinor: 100000 }
      ],
      version: 1,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
      createdBy: "rahul"
    };

    expect(calculateGroupBalances([expense], members)).toEqual([
      { memberId: "rahul", netMinor: 300000, paidMinor: 400000, shareMinor: 100000 },
      { memberId: "amit", netMinor: -100000, paidMinor: 0, shareMinor: 100000 },
      { memberId: "priya", netMinor: -100000, paidMinor: 0, shareMinor: 100000 },
      { memberId: "neha", netMinor: -100000, paidMinor: 0, shareMinor: 100000 }
    ]);
  });

  it("simplifies settlement payments greedily", () => {
    const payments = simplifySettlements({
      currency: "INR",
      balances: [
        { memberId: "amit", netMinor: -90000, paidMinor: 0, shareMinor: 90000 },
        { memberId: "priya", netMinor: -70000, paidMinor: 0, shareMinor: 70000 },
        { memberId: "neha", netMinor: -50000, paidMinor: 0, shareMinor: 50000 },
        { memberId: "rahul", netMinor: 210000, paidMinor: 210000, shareMinor: 0 }
      ]
    });

    expect(payments).toEqual([
      { fromMemberId: "amit", toMemberId: "rahul", amountMinor: 90000, currency: "INR" },
      { fromMemberId: "priya", toMemberId: "rahul", amountMinor: 70000, currency: "INR" },
      { fromMemberId: "neha", toMemberId: "rahul", amountMinor: 50000, currency: "INR" }
    ]);
  });
});
