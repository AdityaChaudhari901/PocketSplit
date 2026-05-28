import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { formatMoney } from "@/lib/money";
import { spacing, useAppTheme } from "@/lib/theme";
import type { CurrencyCode, SplitMember } from "@/types/domain";

interface BalanceRowProps {
  member?: SplitMember;
  netMinor: number;
  currency: CurrencyCode;
}

export const BalanceRow = ({ member, netMinor, currency }: BalanceRowProps) => {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <View>
        <AppText>{member?.displayName ?? "Unknown member"}</AppText>
        <AppText variant="caption" muted>
          {netMinor > 0 ? "should receive" : netMinor < 0 ? "should pay" : "settled"}
        </AppText>
      </View>
      <AppText style={{ color: netMinor > 0 ? theme.colors.success : netMinor < 0 ? theme.colors.danger : theme.colors.subtext }}>
        {formatMoney(Math.abs(netMinor), currency)}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  }
});
