import { describe, expect, it } from "vitest";

import { canUseFeature, consumeUsage, getDefaultPlanForAuthMode, getPlanLimits, isFeatureLocked } from "@/services/entitlement.service";
import type { EntitlementState } from "@/types/domain";

describe("entitlement service", () => {
  it("gates premium features centrally", () => {
    const free: EntitlementState = { planId: "free", usage: {} };
    expect(isFeatureLocked(free, "ai_assistant")).toBe(true);
    expect(canUseFeature(free, "manual_expense")).toBe(true);
  });

  it("tracks usage limits", () => {
    let free: EntitlementState = { planId: "free", usage: { receipt_scan: 4 } };
    expect(canUseFeature(free, "receipt_scan")).toBe(true);
    free = consumeUsage(free, "receipt_scan");
    expect(canUseFeature(free, "receipt_scan")).toBe(false);
  });

  it("supports pro and premium with monthly and yearly billing", () => {
    const proMonthly: EntitlementState = { planId: "pro_monthly", usage: { receipt_scan: 250 } };
    const proYearly: EntitlementState = { planId: "pro_yearly", usage: { receipt_scan: 250 } };
    const premiumYearly: EntitlementState = { planId: "premium_yearly", usage: { split_group: 250 } };

    expect(canUseFeature(proMonthly, "ai_assistant")).toBe(true);
    expect(canUseFeature(proYearly, "advanced_split")).toBe(false);
    expect(canUseFeature(premiumYearly, "advanced_split")).toBe(true);
  });

  it("falls back safely from removed plan ids", () => {
    expect(getPlanLimits("monthly")).toEqual(getPlanLimits("pro_monthly"));
    expect(getPlanLimits("group_pro")).toEqual(getPlanLimits("premium_monthly"));
    expect(getPlanLimits("unknown-plan")).toEqual(getPlanLimits("free"));
  });

  it("gives local demo sessions premium access without upgrading Supabase users", () => {
    expect(getDefaultPlanForAuthMode("local")).toBe("premium_yearly");
    expect(getDefaultPlanForAuthMode("supabase")).toBe("free");
  });
});
