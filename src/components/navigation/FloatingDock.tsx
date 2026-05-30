import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { dockColors } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { dockMetrics, radii, space } from "@/theme/spacing";
import { textStyles } from "@/theme/typography";

type RouterPushTarget = Parameters<ReturnType<typeof useRouter>["push"]>[0];

export interface FloatingDockItem {
  activePaths?: string[];
  accessibilityLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  prominent?: boolean;
  route: string;
}

interface FloatingDockProps {
  activePath?: string;
  items?: FloatingDockItem[];
  style?: StyleProp<ViewStyle>;
}

export const defaultDockItems: FloatingDockItem[] = [
  { label: "Home", icon: "home", route: "/", activePaths: ["/", "/search"] },
  { label: "Split", icon: "people", route: "/split", activePaths: ["/split", "/modals/group-detail", "/modals/add-split-expense", "/modals/create-group", "/modals/settle-up"] },
  { label: "Add", icon: "add", route: "/add", activePaths: ["/add", "/modals/add-expense", "/modals/add-income"], prominent: true },
  { label: "AI", icon: "sparkles-outline", route: "/ai", activePaths: ["/ai"] },
  { label: "Reports", icon: "bar-chart-outline", route: "/reports", activePaths: ["/reports", "/calendar"] }
];

const isDockItemActive = (pathname: string, item: FloatingDockItem) => {
  const paths = item.activePaths ?? [item.route];
  return paths.some((path) => pathname === path || (path !== "/" && pathname.startsWith(path)));
};

const DockButton = memo(({ active, item, onPress }: { active: boolean; item: FloatingDockItem; onPress: () => void }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(active ? motion.activeScale : 1, motion.spring) }]
  }));

  const foreground = item.prominent || active ? dockColors.activeForeground : dockColors.inactiveForeground;

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={styles.pressTarget}
    >
      {({ pressed }) => (
        <Animated.View style={[styles.item, item.prominent ? styles.prominentItem : null, animatedStyle, pressed ? styles.pressed : null]}>
          <View style={[styles.iconShell, item.prominent ? styles.prominentIconShell : active ? styles.activeIconShell : null]}>
            <Ionicons name={item.icon} size={item.prominent ? 27 : 22} color={foreground} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: item.prominent ? (active ? dockColors.addBackground : dockColors.inactiveForeground) : active ? dockColors.activeBackground : dockColors.inactiveForeground }]}
          >
            {item.label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
});

DockButton.displayName = "DockButton";

export const FloatingDock = ({ activePath, items = defaultDockItems, style }: FloatingDockProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const resolvedPath = activePath ?? pathname;

  const dockItems = useMemo(() => items, [items]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, dockMetrics.bottomOffset) }, style]}>
      <GlassCard variant="dock" padding="none" style={styles.card} contentStyle={styles.content}>
        {dockItems.map((item) => (
          <DockButton
            key={`${item.label}-${item.route}`}
            active={isDockItemActive(resolvedPath, item)}
            item={item}
            onPress={() => {
              router.push(item.route as RouterPushTarget);
            }}
          />
        ))}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: dockMetrics.horizontalMargin,
    right: dockMetrics.horizontalMargin,
    bottom: 0,
    zIndex: 20
  },
  card: {
    borderRadius: radii.dock
  },
  content: {
    minHeight: dockMetrics.height,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: space[2]
  },
  pressTarget: {
    flex: 1,
    alignItems: "center"
  },
  item: {
    width: dockMetrics.itemSize,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  prominentItem: {
    marginTop: 0
  },
  iconShell: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center"
  },
  activeIconShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: dockColors.activeBackground
  },
  prominentIconShell: {
    width: dockMetrics.addSize,
    height: dockMetrics.addSize,
    borderRadius: radii.full,
    backgroundColor: dockColors.addBackground,
    shadowColor: dockColors.addBackground,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 5
  },
  label: {
    ...textStyles.dockLabel,
    maxWidth: dockMetrics.itemSize,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.82
  }
});
