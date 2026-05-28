import { Stack } from "expo-router";

import { PrivateRouteGate } from "@/components/auth/PrivateRouteGate";

export default function ModalsLayout() {
  return (
    <PrivateRouteGate>
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: "modal"
        }}
      />
    </PrivateRouteGate>
  );
}
