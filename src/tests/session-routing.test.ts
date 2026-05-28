import { describe, expect, it } from "vitest";

import { getEntryRoute, getPrivateRouteRedirect } from "@/services/session-routing.service";

describe("session routing", () => {
  it("sends a first-time user to onboarding", () => {
    expect(getEntryRoute({ hasSeenOnboarding: false, isAuthenticated: false })).toBe("/(auth)/onboarding");
    expect(getPrivateRouteRedirect({ hasSeenOnboarding: false, isAuthenticated: false })).toBe("/(auth)/onboarding");
  });

  it("requires login after onboarding has been seen", () => {
    expect(getEntryRoute({ hasSeenOnboarding: true, isAuthenticated: false })).toBe("/(auth)/login");
    expect(getPrivateRouteRedirect({ hasSeenOnboarding: true, isAuthenticated: false })).toBe("/(auth)/login");
  });

  it("allows authenticated users into the app", () => {
    expect(getEntryRoute({ hasSeenOnboarding: true, isAuthenticated: true })).toBe("/(tabs)");
    expect(getPrivateRouteRedirect({ hasSeenOnboarding: true, isAuthenticated: true })).toBeNull();
  });
});
