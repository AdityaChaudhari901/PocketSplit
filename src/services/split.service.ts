import { calculateGroupBalances, simplifySettlements, validateSplit, type SplitDraft } from "@/lib/split";
import type { CurrencyCode, GroupExpense, SplitMember, SplitMethod } from "@/types/domain";

export const createSplitExpense = ({
  groupId,
  title,
  amountMinor,
  currency,
  paidByMemberId,
  splitMethod,
  drafts,
  members,
  createdBy
}: {
  groupId: string;
  title: string;
  amountMinor: number;
  currency: CurrencyCode;
  paidByMemberId: string;
  splitMethod: SplitMethod;
  drafts?: SplitDraft[];
  members: SplitMember[];
  createdBy: string;
}): GroupExpense => {
  const validation = validateSplit({
    amountMinor,
    method: splitMethod,
    drafts,
    memberIds: members.filter((member) => !member.deletedAt).map((member) => member.id)
  });

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  const now = new Date().toISOString();
  return {
    id: `gexp-${Date.now()}`,
    groupId,
    title,
    amountMinor,
    currency,
    paidByMemberId,
    splitMethod,
    occurredAt: now,
    splits: validation.splits,
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy,
    updatedBy: createdBy
  };
};

export const getSimplifiedSettlementPlan = ({
  expenses,
  members,
  currency
}: {
  expenses: GroupExpense[];
  members: SplitMember[];
  currency: CurrencyCode;
}) => simplifySettlements({ balances: calculateGroupBalances(expenses, members), currency });
