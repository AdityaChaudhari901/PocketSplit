import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { GluestackUIProvider } from "@/components/gluestack/gluestack-ui-provider";
import { useAppTheme } from "@/lib/theme";

import "../../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000
    }
  }
});

export default function RootLayout() {
  const theme = useAppTheme();

  return (
    <GluestackUIProvider mode={theme.mode}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modals" options={{ presentation: "modal" }} />
          </Stack>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}
