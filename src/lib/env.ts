export interface ClientEnv {
  appEnv: "development" | "staging" | "production";
  enableDemoMode: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const normalizeAppEnv = (value?: string): ClientEnv["appEnv"] => {
  if (value === "production" || value === "staging" || value === "development") {
    return value;
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
};

const readBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const hasUsableValue = (value: string | undefined): boolean =>
  Boolean(value && !value.includes("your-") && !value.includes("example.") && value !== "https://your-project.supabase.co");

export const getClientEnv = (): ClientEnv => {
  const appEnv = normalizeAppEnv(process.env.EXPO_PUBLIC_APP_ENV);
  return {
    appEnv,
    enableDemoMode: readBoolean(process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE, appEnv !== "production"),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  };
};

export const isSupabaseConfigured = (): boolean => {
  const env = getClientEnv();
  return hasUsableValue(env.supabaseUrl) && hasUsableValue(env.supabaseAnonKey);
};

export const isProductionEnv = (): boolean => getClientEnv().appEnv === "production";

export const isDemoModeEnabled = (): boolean => {
  const env = getClientEnv();
  return env.appEnv !== "production" && env.enableDemoMode;
};

export const isLocalDemoAuthEnabled = (): boolean => isDemoModeEnabled() && !isSupabaseConfigured();

export const assertProductionClientConfig = (): void => {
  if (isProductionEnv() && !isSupabaseConfigured()) {
    throw new Error("Supabase must be configured before running PocketSplit in production.");
  }
};
