import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { PrivateRouteGate } from "@/components/auth/PrivateRouteGate";
import { useTranslation } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

const TabIcon = ({
  focused,
  icon,
  label
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) => {
  const theme = useAppTheme();
  const color = focused ? theme.colors.primary : theme.colors.subtext;

  return (
    <View style={[styles.tabItem, focused ? { backgroundColor: theme.colors.primarySoft } : null]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={[styles.tabLabel, { color }]}>
        {label}
      </Text>
    </View>
  );
};

const AddTabIcon = ({ focused, label }: { focused: boolean; label: string }) => {
  const theme = useAppTheme();

  return (
    <View style={styles.addItem}>
      <View
        style={[
          styles.addButton,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.surface,
            shadowColor: theme.colors.shadow
          },
          focused ? { transform: [{ scale: 0.98 }] } : null
        ]}
      >
        <Ionicons name="add" size={32} color={theme.colors.onPrimary} />
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        style={[styles.tabLabel, styles.addText, { color: focused ? theme.colors.primary : theme.colors.subtext }]}
      >
        {label}
      </Text>
    </View>
  );
};

type TabButtonProps = ComponentProps<typeof Pressable> & { ref?: unknown };

const renderTabButton = (props: unknown) => {
  const { ref: _ref, ...pressableProps } = props as TabButtonProps;
  return <Pressable {...pressableProps} hitSlop={{ top: 24, bottom: 10, left: 10, right: 10 }} />;
};

const renderAddTabButton = (props: unknown) => {
  const { ref: _ref, ...pressableProps } = props as TabButtonProps;
  return <Pressable {...pressableProps} hitSlop={{ top: 42, bottom: 12, left: 14, right: 14 }} />;
};

const hiddenTabOptions = {
  href: null,
  tabBarItemStyle: { display: "none" as const }
};

export default function TabsLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  return (
    <PrivateRouteGate>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.subtext,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 0,
            height: 82,
            paddingTop: 8,
            paddingHorizontal: 8,
            paddingBottom: Platform.OS === "ios" ? 8 : 6,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.14,
            shadowRadius: 20,
            elevation: 12
          },
          tabBarItemStyle: {
            minHeight: 64,
            borderRadius: 18
          },
          tabBarButton: renderTabButton
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="home" label={t("tabs.home")} />
          }}
        />
        <Tabs.Screen
          name="split"
          options={{
            title: t("tabs.split"),
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="people" label={t("tabs.split")} />
          }}
        />
        <Tabs.Screen
          name="calendar/index"
          options={{
            title: t("tabs.calendar"),
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="calendar-outline" label={t("tabs.calendar")} />
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: t("tabs.add"),
            tabBarIcon: ({ focused }) => <AddTabIcon focused={focused} label={t("tabs.add")} />,
            tabBarButton: renderAddTabButton,
            tabBarItemStyle: styles.addTabItem
          }}
        />
        <Tabs.Screen
          name="ai"
          options={{
            title: t("tabs.ai"),
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="chatbubble-ellipses-outline" label={t("tabs.ai")} />,
            tabBarStyle: { display: "none" }
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: t("tabs.reports"),
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="bar-chart-outline" label={t("tabs.reports")} />
          }}
        />
        <Tabs.Screen name="categories/index" options={hiddenTabOptions} />
        <Tabs.Screen name="categories/new" options={hiddenTabOptions} />
        <Tabs.Screen name="categories/[id]/edit" options={hiddenTabOptions} />
        <Tabs.Screen name="tags/index" options={hiddenTabOptions} />
        <Tabs.Screen name="search/index" options={hiddenTabOptions} />
      </Tabs>
    </PrivateRouteGate>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    width: 52,
    height: 62,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  tabLabel: {
    width: "100%",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "500",
    textAlign: "center"
  },
  addItem: {
    width: 62,
    height: 68,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 0
  },
  addButton: {
    width: 58,
    height: 58,
    marginTop: -26,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  addTabItem: {
    minHeight: 64,
    justifyContent: "flex-start"
  },
  addText: {
    marginTop: -1,
    paddingHorizontal: 4
  }
});
