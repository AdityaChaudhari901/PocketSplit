import type { ReactNode } from "react";
import { Redirect } from "expo-router";

import { useAppStoreHydration } from "@/hooks/useAppStoreHydration";
import { usePrivateSessionValidation } from "@/hooks/usePrivateSessionValidation";
import { getPrivateRouteRedirect } from "@/services/session-routing.service";
import { useAppStore } from "@/store/app.store";

interface PrivateRouteGateProps {
  children: ReactNode;
}

export const PrivateRouteGate = ({ children }: PrivateRouteGateProps) => {
  const hasHydrated = useAppStoreHydration();
  const isValidatingSession = usePrivateSessionValidation(hasHydrated);
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!hasHydrated || isValidatingSession) {
    return null;
  }

  const redirect = getPrivateRouteRedirect({ hasSeenOnboarding, isAuthenticated });
  if (redirect) {
    return <Redirect href={redirect} />;
  }

  return children;
};
