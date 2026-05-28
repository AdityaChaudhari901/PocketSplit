import { Redirect } from "expo-router";

import { useAppStoreHydration } from "@/hooks/useAppStoreHydration";
import { getEntryRoute } from "@/services/session-routing.service";
import { useAppStore } from "@/store/app.store";

export default function IndexRoute() {
  const hasHydrated = useAppStoreHydration();
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!hasHydrated) {
    return null;
  }

  return <Redirect href={getEntryRoute({ hasSeenOnboarding, isAuthenticated })} />;
}
