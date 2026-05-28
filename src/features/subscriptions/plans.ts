import type { PlanId } from "@/types/domain";

export type BillingPeriod = "monthly" | "yearly";
export type PlanTierId = "free" | "pro" | "premium";

export interface PlanOptionCopy {
  id: PlanId;
  tierId: Exclude<PlanTierId, "free">;
  billingPeriod: BillingPeriod;
  price: string;
  billingLabel: string;
  savingsLabel?: string;
}

export interface PlanTierCopy {
  tierId: PlanTierId;
  title: string;
  body: string;
  badge: string;
  featured?: boolean;
  options: PlanOptionCopy[];
}

export const FREE_PLAN: PlanTierCopy = {
  tierId: "free",
  title: "Free",
  body: "Manual tracking, basic budgets, limited receipt scans, and equal splits.",
  badge: "Default",
  options: []
};

export const PAID_PLAN_TIERS: PlanTierCopy[] = [
  {
    tierId: "pro",
    title: "Pro",
    body: "AI categorization, receipt scanning, advanced reports, exports, and AI assistant.",
    badge: "Popular",
    options: [
      {
        id: "pro_monthly",
        tierId: "pro",
        billingPeriod: "monthly",
        price: "₹299",
        billingLabel: "per month"
      },
      {
        id: "pro_yearly",
        tierId: "pro",
        billingPeriod: "yearly",
        price: "₹2,499",
        billingLabel: "per year",
        savingsLabel: "Save 30%"
      }
    ]
  },
  {
    tierId: "premium",
    title: "Premium",
    body: "Everything in Pro plus unlimited groups, advanced splits, smart settlement, reminders, and priority reports.",
    badge: "Best value",
    featured: true,
    options: [
      {
        id: "premium_monthly",
        tierId: "premium",
        billingPeriod: "monthly",
        price: "₹499",
        billingLabel: "per month"
      },
      {
        id: "premium_yearly",
        tierId: "premium",
        billingPeriod: "yearly",
        price: "₹4,999",
        billingLabel: "per year",
        savingsLabel: "Save 16%"
      }
    ]
  }
];

export const PLAN_TIERS: PlanTierCopy[] = [FREE_PLAN, ...PAID_PLAN_TIERS];

export const getPlanOption = (tier: PlanTierCopy, billingPeriod: BillingPeriod): PlanOptionCopy | null =>
  tier.options.find((option) => option.billingPeriod === billingPeriod) ?? null;
