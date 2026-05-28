import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { spacing, useAppTheme } from "@/lib/theme";

interface ScreenProps {
  scroll?: boolean;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const Screen = ({ children, scroll = true, contentStyle, refreshing, onRefresh }: PropsWithChildren<ScreenProps>) => {
  const theme = useAppTheme();

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.canvas }]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  }
});
