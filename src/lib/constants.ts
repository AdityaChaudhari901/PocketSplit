import type { Category, CurrencyCode, Wallet, WalletType } from "@/types/domain";

export const APP_NAME = "MoneyPulse AI";
export const DEFAULT_CURRENCY: CurrencyCode = "INR";
export const DEMO_USER_ID = "demo-user";
export const PRIMARY_WALLET_ID = "wallet-primary";

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  cash: "Cash",
  bank: "Bank",
  card: "Card",
  upi: "UPI",
  credit_card: "Credit card",
  loan: "Loan"
};

export const SYSTEM_EXPENSE_CATEGORIES = [
  "Food",
  "Rent",
  "Travel",
  "Shopping",
  "Bills",
  "EMI",
  "Subscriptions",
  "Health",
  "Entertainment",
  "Education",
  "Other"
] as const;

export const createSystemCategories = (ownerId: string, now: string): Category[] => {
  const expenseCategories: Category[] = SYSTEM_EXPENSE_CATEGORIES.map((name, index) => ({
    id: `cat-${name.toLowerCase().replace(/\s+/g, "-")}`,
    ownerId,
    name,
    kind: "expense",
    icon: ["utensils", "home", "plane", "bag", "receipt", "bank", "repeat", "heart", "film-outline", "book", "circle"][
      index
    ] ?? "circle",
    color: [
      "#F97316",
      "#1769E0",
      "#0EA5E9",
      "#DB2777",
      "#B7791F",
      "#475467",
      "#0F766E",
      "#059669",
      "#C2410C",
      "#0284C7",
      "#6B7280"
    ][index] ?? "#6B7280",
    isSystem: true,
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId
  }));

  const incomeCategory: Category = {
    id: "cat-income",
    ownerId,
    name: "Income",
    kind: "income",
    icon: "briefcase",
    color: "#10B981",
    isSystem: true,
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId
  };

  return [...expenseCategories, incomeCategory];
};

export const createSystemWallets = (ownerId: string, now: string, currency: CurrencyCode = DEFAULT_CURRENCY): Wallet[] => [
  {
    id: PRIMARY_WALLET_ID,
    ownerId,
    name: "Primary wallet",
    type: "bank",
    currency,
    balanceMinor: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId
  }
];
