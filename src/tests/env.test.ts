import { afterEach, describe, expect, it } from "vitest";

import { getClientEnv, isDemoModeEnabled, isLocalDemoAuthEnabled, isSupabaseConfigured } from "@/lib/env";

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

describe("client env", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("treats placeholder Supabase values as unconfigured", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "your-supabase-anon-key";

    expect(isSupabaseConfigured()).toBe(false);
  });

  it("detects usable Supabase public configuration", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example";

    expect(isSupabaseConfigured()).toBe(true);
  });

  it("disables demo mode in production even when explicitly requested", () => {
    process.env.EXPO_PUBLIC_APP_ENV = "production";
    process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE = "true";

    expect(getClientEnv().appEnv).toBe("production");
    expect(isDemoModeEnabled()).toBe(false);
  });

  it("keeps demo mode available by default in local development", () => {
    process.env.EXPO_PUBLIC_APP_ENV = "development";
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "your-supabase-anon-key";
    delete process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE;

    expect(isDemoModeEnabled()).toBe(true);
  });

  it("only enables local demo auth when Supabase is not configured", () => {
    process.env.EXPO_PUBLIC_APP_ENV = "development";
    process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE = "true";
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example";

    expect(isDemoModeEnabled()).toBe(true);
    expect(isLocalDemoAuthEnabled()).toBe(false);

    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "your-supabase-anon-key";

    expect(isLocalDemoAuthEnabled()).toBe(true);
  });
});
