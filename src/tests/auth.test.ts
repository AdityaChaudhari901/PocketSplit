import { afterEach, describe, expect, it } from "vitest";

import { signInDemo } from "@/services/auth.service";

const ENV_KEYS = ["EXPO_PUBLIC_APP_ENV", "EXPO_PUBLIC_ENABLE_DEMO_MODE"] as const;
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

describe("auth service", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("allows explicit local demo sign in outside production", async () => {
    process.env.EXPO_PUBLIC_APP_ENV = "development";
    process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE = "true";

    const result = await signInDemo();

    expect(result.mode).toBe("local");
    expect(result.profile.email).toBe("demo@moneypulse.ai");
  });

  it("blocks explicit demo sign in in production", async () => {
    process.env.EXPO_PUBLIC_APP_ENV = "production";
    process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE = "true";

    await expect(signInDemo()).rejects.toThrow("Demo mode is disabled");
  });
});
