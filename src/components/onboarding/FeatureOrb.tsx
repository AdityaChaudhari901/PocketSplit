import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { radius, spacing, useAppTheme } from "@/lib/theme";

export const FeatureOrb = () => {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel="PocketSplit insight preview"
      style={[
        styles.stage,
        {
          backgroundColor: theme.colors.surfaceMuted
        }
      ]}
    >
      <View style={[styles.preview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
        <View style={styles.previewHeader}>
          <View>
            <AppText variant="label" muted>
              Safe today
            </AppText>
            <AppText variant="hero" style={[styles.amount, { color: theme.colors.success }]}>
              ₹420
            </AppText>
          </View>
          <View style={[styles.mark, { backgroundColor: theme.colors.successSoft }]}>
            <Ionicons name="pulse-outline" size={22} color={theme.colors.success} />
          </View>
        </View>

        <View style={[styles.planTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
          <View style={[styles.planSegment, styles.planBills, { backgroundColor: theme.colors.warning }]} />
          <View style={[styles.planSegment, styles.planSavings, { backgroundColor: theme.colors.success }]} />
          <View style={[styles.planSegment, styles.planSpend, { backgroundColor: theme.colors.primary }]} />
        </View>

        <View style={styles.rows}>
          {[
            { icon: "calendar-outline" as const, label: "Bills protected", value: "₹18.4k", tone: theme.colors.warning },
            { icon: "flag-outline" as const, label: "Savings guarded", value: "₹6.0k", tone: theme.colors.success },
            { icon: "wallet-outline" as const, label: "Free to spend", value: "₹12.8k", tone: theme.colors.primary }
          ].map((row) => (
            <View key={row.label} style={[styles.moneyRow, { borderColor: theme.colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name={row.icon} size={15} color={row.tone} />
              </View>
              <AppText variant="caption" muted style={styles.rowLabel}>
                {row.label}
              </AppText>
              <AppText variant="caption" style={[styles.rowValue, { color: row.tone }]}>
                {row.value}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  preview: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 4
  },
  previewHeader: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  amount: {
    fontSize: 42,
    lineHeight: 46
  },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  planTrack: {
    height: 12,
    borderRadius: radius.pill,
    overflow: "hidden",
    flexDirection: "row"
  },
  planSegment: {
    height: "100%"
  },
  planBills: {
    flex: 2
  },
  planSavings: {
    flex: 2
  },
  planSpend: {
    flex: 3
  },
  rows: {
    gap: spacing.sm
  },
  moneyRow: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  rowLabel: {
    flex: 1
  },
  rowValue: {
    fontWeight: "900"
  }
});
