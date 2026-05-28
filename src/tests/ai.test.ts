import { afterEach, describe, expect, it, vi } from "vitest";

import { askMoneyAssistant } from "@/services/ai.service";

const { invokeAiFunctionMock } = vi.hoisted(() => ({
  invokeAiFunctionMock: vi.fn()
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    functions: {
      invoke: invokeAiFunctionMock
    }
  })
}));

const ENV_KEYS = [
  "EXPO_PUBLIC_APP_ENV",
  "EXPO_PUBLIC_ENABLE_DEMO_MODE",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const restoreEnv = () => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

describe("AI service", () => {
  afterEach(() => {
    invokeAiFunctionMock.mockReset();
    restoreEnv();
  });

  it("uses the local demo assistant response when the Edge Function fails in demo mode", async () => {
    process.env.EXPO_PUBLIC_APP_ENV = "development";
    process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE = "true";
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "usable-anon-key";
    invokeAiFunctionMock.mockResolvedValue({ data: null, error: new Error("Function not found") });

    const response = await askMoneyAssistant("Can I afford dinner out this weekend?", [
      { role: "user", content: "I have rent due this week." }
    ]);

    expect(response.answer).toContain("Before spending");
    expect(response.disclaimer).toBe("Educational spending insight, not financial advice.");
    expect(invokeAiFunctionMock).toHaveBeenCalledWith("ai-insights", {
      body: {
        task: "assistant",
        payload: {
          question: "Can I afford dinner out this weekend?",
          conversation: [{ role: "user", content: "I have rent due this week." }]
        }
      }
    });
  });

  it("does not hide Edge Function failures in production", async () => {
    process.env.EXPO_PUBLIC_APP_ENV = "production";
    process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE = "false";
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "usable-anon-key";
    invokeAiFunctionMock.mockResolvedValue({ data: null, error: new Error("Function not found") });

    await expect(askMoneyAssistant("Can I afford dinner out this weekend?")).rejects.toThrow(
      "AI service is temporarily unavailable"
    );
  });
});
