import type { CurrencyCode, GroupExpense, GroupExpenseSplit, SplitMember, SplitMethod } from "@/types/domain";

export interface MemberBalance {
  memberId: string;
  netMinor: number;
  paidMinor: number;
  shareMinor: number;
}

export interface SettlementPayment {
  fromMemberId: string;
  toMemberId: string;
  amountMinor: number;
  currency: CurrencyCode;
}

export interface SplitDraft {
  memberId: string;
  amountMinor?: number;
  percentageBps?: number;
  shares?: number;
  excluded?: boolean;
}

export interface SplitValidationResult {
  valid: boolean;
  errors: string[];
  splits: GroupExpenseSplit[];
}

export const isActiveSplitMember = (member: SplitMember): boolean => !member.deletedAt;

export const getActiveSplitMembers = (members: SplitMember[]): SplitMember[] => members.filter(isActiveSplitMember);

export const hasMinimumSplitMembers = (members: SplitMember[]): boolean => getActiveSplitMembers(members).length >= 2;

const distributeRemainder = (amountMinor: number, memberIds: string[]): GroupExpenseSplit[] => {
  const base = Math.floor(amountMinor / memberIds.length);
  let remainder = amountMinor - base * memberIds.length;

  return memberIds.map((memberId) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { memberId, amountMinor: base + extra };
  });
};

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const calculateExpenseShares = ({
  amountMinor,
  method,
  drafts,
  memberIds
}: {
  amountMinor: number;
  method: SplitMethod;
  drafts?: SplitDraft[];
  memberIds: string[];
}): GroupExpenseSplit[] => {
  const includedMemberIds = memberIds.filter((memberId) => !drafts?.some((draft) => draft.memberId === memberId && draft.excluded));

  if (includedMemberIds.length === 0) {
    throw new Error("At least one member must be included in the split.");
  }

  if (method === "equal") {
    return distributeRemainder(amountMinor, includedMemberIds);
  }

  if (!drafts || drafts.length === 0) {
    throw new Error(`${method} split requires split details.`);
  }

  if (method === "exact" || method === "itemwise" || method === "custom") {
    return includedMemberIds.map((memberId) => ({
      memberId,
      amountMinor: drafts.find((draft) => draft.memberId === memberId)?.amountMinor ?? 0
    }));
  }

  if (method === "percentage") {
    return includedMemberIds.map((memberId) => {
      const percentageBps = drafts.find((draft) => draft.memberId === memberId)?.percentageBps ?? 0;
      return {
        memberId,
        percentageBps,
        amountMinor: Math.round((amountMinor * percentageBps) / 10000)
      };
    });
  }

  const totalShares = sum(includedMemberIds.map((memberId) => drafts.find((draft) => draft.memberId === memberId)?.shares ?? 0));
  if (totalShares <= 0) {
    throw new Error("Share-based split requires positive shares.");
  }

  let allocated = 0;
  return includedMemberIds.map((memberId, index) => {
    const shares = drafts.find((draft) => draft.memberId === memberId)?.shares ?? 0;
    const amount = index === includedMemberIds.length - 1 ? amountMinor - allocated : Math.round((amountMinor * shares) / totalShares);
    allocated += amount;
    return { memberId, amountMinor: amount, shares };
  });
};

export const validateSplit = ({
  amountMinor,
  method,
  drafts,
  memberIds
}: {
  amountMinor: number;
  method: SplitMethod;
  drafts?: SplitDraft[];
  memberIds: string[];
}): SplitValidationResult => {
  const errors: string[] = [];
  let splits: GroupExpenseSplit[] = [];

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    errors.push("Expense amount must be a positive integer in minor units.");
  }

  try {
    splits = calculateExpenseShares({ amountMinor, method, drafts, memberIds });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unable to calculate split.");
  }

  if (method === "percentage") {
    const percentageTotal = sum(splits.map((split) => split.percentageBps ?? 0));
    if (percentageTotal !== 10000) {
      errors.push("Percentages must total 100%.");
    }
  }

  if (method === "shares" && splits.some((split) => (split.shares ?? 0) <= 0)) {
    errors.push("Shares must be positive for every included member.");
  }

  if (splits.some((split) => split.amountMinor < 0)) {
    errors.push("Split amounts cannot be negative.");
  }

  const splitTotal = sum(splits.map((split) => split.amountMinor));
  if (splits.length > 0 && splitTotal !== amountMinor) {
    errors.push(`Split total ${splitTotal} must equal expense total ${amountMinor}.`);
  }

  const unknownMemberIds = splits.map((split) => split.memberId).filter((memberId) => !memberIds.includes(memberId));
  if (unknownMemberIds.length > 0) {
    errors.push("Every split must belong to a group member.");
  }

  return {
    valid: errors.length === 0,
    errors,
    splits
  };
};

export const calculateGroupBalances = (expenses: GroupExpense[], members: SplitMember[]): MemberBalance[] => {
  const balances = new Map<string, MemberBalance>();
  members.forEach((member) => {
    balances.set(member.id, {
      memberId: member.id,
      netMinor: 0,
      paidMinor: 0,
      shareMinor: 0
    });
  });

  expenses
    .filter((expense) => !expense.deletedAt)
    .forEach((expense) => {
      const payer = balances.get(expense.paidByMemberId);
      if (payer) {
        payer.paidMinor += expense.amountMinor;
        payer.netMinor += expense.amountMinor;
      }

      expense.splits
        .filter((split) => !split.excluded)
        .forEach((split) => {
          const balance = balances.get(split.memberId);
          if (!balance) {
            return;
          }
          balance.shareMinor += split.amountMinor;
          balance.netMinor -= split.amountMinor;
        });
    });

  return [...balances.values()];
};

export const calculateUserNetBalance = (
  expenses: GroupExpense[],
  members: SplitMember[],
  memberId: string
): MemberBalance => {
  const balance = calculateGroupBalances(expenses, members).find((item) => item.memberId === memberId);
  if (!balance) {
    throw new Error("Member not found in group.");
  }
  return balance;
};

export const simplifySettlements = ({
  balances,
  currency
}: {
  balances: MemberBalance[];
  currency: CurrencyCode;
}): SettlementPayment[] => {
  const creditors = balances
    .filter((balance) => balance.netMinor > 0)
    .map((balance) => ({ memberId: balance.memberId, amountMinor: balance.netMinor }))
    .sort((left, right) => right.amountMinor - left.amountMinor);

  const debtors = balances
    .filter((balance) => balance.netMinor < 0)
    .map((balance) => ({ memberId: balance.memberId, amountMinor: Math.abs(balance.netMinor) }))
    .sort((left, right) => right.amountMinor - left.amountMinor);

  const payments: SettlementPayment[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    if (!debtor || !creditor) {
      break;
    }

    const amountMinor = Math.min(debtor.amountMinor, creditor.amountMinor);
    if (amountMinor > 0) {
      payments.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountMinor,
        currency
      });
    }

    debtor.amountMinor -= amountMinor;
    creditor.amountMinor -= amountMinor;

    if (debtor.amountMinor === 0) {
      debtorIndex += 1;
    }
    if (creditor.amountMinor === 0) {
      creditorIndex += 1;
    }
  }

  return payments;
};
