import { DEMO_USER_ID } from "@/lib/constants";
import { isDemoModeEnabled, isLocalDemoAuthEnabled } from "@/lib/env";
import { getSupabaseClient } from "@/lib/supabase";
import type { AuthMode, CurrencyCode, Profile } from "@/types/domain";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthResult {
  profile: Profile;
  mode: AuthMode;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  currency: CurrencyCode;
  biometric_enabled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  currency: row.currency,
  biometricEnabled: row.biometric_enabled,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  createdBy: row.created_by ?? row.id,
  updatedBy: row.updated_by
});

const displayNameFromEmail = (email: string): string => email.split("@")[0]?.replace(/[._-]+/g, " ") || "User";

const demoProfile = (email = "demo@moneypulse.ai"): Profile => {
  const now = new Date().toISOString();
  return {
    id: DEMO_USER_ID,
    email,
    displayName: displayNameFromEmail(email),
    currency: "INR",
    biometricEnabled: false,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USER_ID
  };
};

const getDemoResult = (email: string): AuthResult => {
  if (!isLocalDemoAuthEnabled()) {
    throw new Error("Supabase is not configured. Set the public Supabase env vars or enable demo mode for local development.");
  }

  return { profile: demoProfile(email), mode: "local" };
};

const getOrCreateProfile = async (supabase: SupabaseClient, user: User, fallbackEmail: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_url,currency,biometric_enabled,created_at,updated_at,deleted_at,created_by,updated_by")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error("Unable to load profile.");
  }

  if (data) {
    return toProfile(data);
  }

  const email = user.email ?? fallbackEmail;
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email,
      display_name: displayNameFromEmail(email),
      currency: "INR",
      biometric_enabled: false,
      created_by: user.id,
      updated_by: user.id
    })
    .select("id,email,display_name,avatar_url,currency,biometric_enabled,created_at,updated_at,deleted_at,created_by,updated_by")
    .single<ProfileRow>();

  if (insertError || !inserted) {
    throw new Error("Unable to create profile.");
  }

  return toProfile(inserted);
};

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return getDemoResult(email);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message === "Invalid login credentials" ? "Email or password is incorrect. Sign up first if this is a new account." : (error?.message ?? "Unable to sign in."));
  }

  return { profile: await getOrCreateProfile(supabase, data.user, email), mode: "supabase" };
};

export const signInDemo = async (): Promise<AuthResult> => {
  if (!isDemoModeEnabled()) {
    throw new Error("Demo mode is disabled for this environment.");
  }

  return { profile: demoProfile(), mode: "local" };
};

export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return getDemoResult(email);
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Unable to create account.");
  }

  if (!data.session) {
    throw new Error("Account created. Check your email to confirm the account before signing in.");
  }

  return { profile: await getOrCreateProfile(supabase, data.user, email), mode: "supabase" };
};

export const signOut = async (): Promise<void> => {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }
};

export const hasActiveSupabaseSession = async (): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return false;
  }

  if (!data.session.expires_at) {
    return true;
  }

  return data.session.expires_at * 1000 > Date.now();
};
