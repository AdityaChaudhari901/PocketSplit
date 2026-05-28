import { useEffect, useState } from "react";

import { isProductionEnv } from "@/lib/env";
import { hasActiveSupabaseSession } from "@/services/auth.service";
import { useAppStore } from "@/store/app.store";

export const usePrivateSessionValidation = (hasHydrated: boolean): boolean => {
  const authMode = useAppStore((state) => state.authMode);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const profileId = useAppStore((state) => state.profile.id);
  const endSession = useAppStore((state) => state.endSession);
  const sanitizeLegacyDemoData = useAppStore((state) => state.sanitizeLegacyDemoData);
  const sessionKey = isAuthenticated && authMode === "supabase" ? `${authMode}:${profileId}` : null;
  const [validatedSessionKey, setValidatedSessionKey] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const clearInvalidSession = () => {
      setValidatedSessionKey(null);
      endSession();
      setIsValidating(false);
    };

    if (!hasHydrated || !isAuthenticated) {
      setValidatedSessionKey(null);
      setIsValidating(false);
      return () => {
        cancelled = true;
      };
    }

    if (authMode === "local") {
      setValidatedSessionKey(null);
      if (isProductionEnv()) {
        clearInvalidSession();
      } else {
        setIsValidating(false);
      }

      return () => {
        cancelled = true;
      };
    }

    if (authMode !== "supabase") {
      clearInvalidSession();
      return () => {
        cancelled = true;
      };
    }

    if (!sessionKey) {
      clearInvalidSession();
      return () => {
        cancelled = true;
      };
    }

    setIsValidating(true);
    hasActiveSupabaseSession()
      .then((hasSession) => {
        if (cancelled) {
          return;
        }

        if (!hasSession) {
          endSession();
          setValidatedSessionKey(null);
          return;
        }

        setValidatedSessionKey(sessionKey);
      })
      .catch(() => {
        if (!cancelled) {
          endSession();
          setValidatedSessionKey(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsValidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authMode, endSession, hasHydrated, isAuthenticated, sessionKey]);

  useEffect(() => {
    if (hasHydrated) {
      sanitizeLegacyDemoData();
    }
  }, [hasHydrated, sanitizeLegacyDemoData]);

  const blocksInvalidMode = hasHydrated && isAuthenticated && (authMode === null || (authMode === "local" && isProductionEnv()));
  const needsSupabaseValidation = hasHydrated && isAuthenticated && authMode === "supabase" && validatedSessionKey !== sessionKey;

  return isValidating || blocksInvalidMode || needsSupabaseValidation;
};
