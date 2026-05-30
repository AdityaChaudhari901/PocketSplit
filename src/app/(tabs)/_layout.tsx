import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { PrivateRouteGate } from "@/components/auth/PrivateRouteGate";
import { FloatingDock } from "@/components/navigation/FloatingDock";
import { useTranslation } from "@/lib/i18n";
import { dockMetrics } from "@/theme/spacing";

const hiddenTabOptions = {
  href: null
};

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <PrivateRouteGate>
      <View style={styles.shell}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: styles.scene,
            tabBarStyle: { display: "none" }
          }}
        >
          <Tabs.Screen name="index" options={{ title: t("tabs.home") }} />
          <Tabs.Screen name="split" options={{ title: t("tabs.split") }} />
          <Tabs.Screen name="add" options={{ title: t("tabs.add") }} />
          <Tabs.Screen name="ai" options={{ title: t("tabs.ai") }} />
          <Tabs.Screen name="reports" options={{ title: t("tabs.reports") }} />
          <Tabs.Screen name="calendar/index" options={hiddenTabOptions} />
          <Tabs.Screen name="search/index" options={hiddenTabOptions} />
          <Tabs.Screen name="categories/index" options={hiddenTabOptions} />
          <Tabs.Screen name="categories/new" options={hiddenTabOptions} />
          <Tabs.Screen name="categories/[id]/edit" options={hiddenTabOptions} />
          <Tabs.Screen name="tags/index" options={hiddenTabOptions} />
        </Tabs>
        <FloatingDock />
      </View>
    </PrivateRouteGate>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1
  },
  scene: {
    paddingBottom: dockMetrics.height + dockMetrics.bottomOffset + 24
  }
});
