export interface SessionRouteState {
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;
}

export type AppEntryRoute = "/(auth)/onboarding" | "/(auth)/login" | "/(tabs)";
export type UnauthenticatedRoute = Exclude<AppEntryRoute, "/(tabs)">;

export const getEntryRoute = ({ hasSeenOnboarding, isAuthenticated }: SessionRouteState): AppEntryRoute => {
  if (!hasSeenOnboarding) {
    return "/(auth)/onboarding";
  }

  if (!isAuthenticated) {
    return "/(auth)/login";
  }

  return "/(tabs)";
};

export const getPrivateRouteRedirect = (state: SessionRouteState): UnauthenticatedRoute | null => {
  const route = getEntryRoute(state);
  return route === "/(tabs)" ? null : route;
};
