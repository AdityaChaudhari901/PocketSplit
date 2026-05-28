import type { AuthMode, EntitlementState, FeatureName, PlanId } from "@/types/domain";

export interface PlanLimits {
  monthlyReceiptScans: number | "unlimited";
  splitGroups: number | "unlimited";
  monthlyGroupExpenses: number | "unlimited";
  aiAssistantQuestions: number | "unlimited";
  features: FeatureName[];
}

const FREE_FEATURES: FeatureName[] = ["manual_expense", "receipt_scan", "split_group", "group_expense", "data_export"];

const PRO_FEATURES: FeatureName[] = [
  "manual_expense",
  "custom_categories",
  "receipt_scan",
  "ai_categorization",
  "ai_assistant",
  "advanced_reports",
  "pdf_export",
  "split_group",
  "group_expense",
  "data_export"
];

const PREMIUM_FEATURES: FeatureName[] = [
  ...PRO_FEATURES,
  "advanced_split",
  "smart_settlement",
  "payment_reminder"
];

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    monthlyReceiptScans: 5,
    splitGroups: 2,
    monthlyGroupExpenses: 20,
    aiAssistantQuestions: 5,
    features: FREE_FEATURES
  },
  pro_monthly: {
    monthlyReceiptScans: "unlimited",
    splitGroups: 3,
    monthlyGroupExpenses: 50,
    aiAssistantQuestions: "unlimited",
    features: PRO_FEATURES
  },
  pro_yearly: {
    monthlyReceiptScans: "unlimited",
    splitGroups: 3,
    monthlyGroupExpenses: 50,
    aiAssistantQuestions: "unlimited",
    features: PRO_FEATURES
  },
  premium_monthly: {
    monthlyReceiptScans: "unlimited",
    splitGroups: "unlimited",
    monthlyGroupExpenses: "unlimited",
    aiAssistantQuestions: "unlimited",
    features: PREMIUM_FEATURES
  },
  premium_yearly: {
    monthlyReceiptScans: "unlimited",
    splitGroups: "unlimited",
    monthlyGroupExpenses: "unlimited",
    aiAssistantQuestions: "unlimited",
    features: PREMIUM_FEATURES
  }
};

export const normalizePlanId = (plan: PlanId | string | null | undefined): PlanId => {
  if (plan === "free" || plan === "pro_monthly" || plan === "pro_yearly" || plan === "premium_monthly" || plan === "premium_yearly") {
    return plan;
  }

  if (plan === "monthly" || plan === "pro") {
    return "pro_monthly";
  }

  if (plan === "yearly") {
    return "pro_yearly";
  }

  if (plan === "family" || plan === "group_pro" || plan === "trip_pack" || plan === "premium") {
    return "premium_monthly";
  }

  return "free";
};

export const getPlanLimits = (plan: PlanId | string): PlanLimits => PLAN_LIMITS[normalizePlanId(plan)];

export const getDefaultPlanForAuthMode = (authMode: AuthMode): PlanId => (authMode === "local" ? "premium_yearly" : "free");

export const isFeatureLocked = (entitlement: EntitlementState, featureName: FeatureName): boolean =>
  !getPlanLimits(entitlement.planId).features.includes(featureName);

export const canUseFeature = (entitlement: EntitlementState, featureName: FeatureName): boolean => {
  if (isFeatureLocked(entitlement, featureName)) {
    return false;
  }

  const limits = getPlanLimits(entitlement.planId);
  const usage = entitlement.usage[featureName] ?? 0;

  if (featureName === "receipt_scan" && limits.monthlyReceiptScans !== "unlimited") {
    return usage < limits.monthlyReceiptScans;
  }

  if (featureName === "split_group" && limits.splitGroups !== "unlimited") {
    return usage < limits.splitGroups;
  }

  if (featureName === "group_expense" && limits.monthlyGroupExpenses !== "unlimited") {
    return usage < limits.monthlyGroupExpenses;
  }

  if (featureName === "ai_assistant" && limits.aiAssistantQuestions !== "unlimited") {
    return usage < limits.aiAssistantQuestions;
  }

  return true;
};

export const consumeUsage = (entitlement: EntitlementState, featureName: FeatureName): EntitlementState => ({
  ...entitlement,
  planId: normalizePlanId(entitlement.planId),
  usage: {
    ...entitlement.usage,
    [featureName]: (entitlement.usage[featureName] ?? 0) + 1
  }
});
