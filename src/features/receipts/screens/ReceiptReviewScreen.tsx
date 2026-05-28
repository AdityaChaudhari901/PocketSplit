import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const ReceiptReviewScreen = () => {
  const router = useRouter();
  const { receiptId } = useLocalSearchParams<{ receiptId?: string }>();
  const receipt = useAppStore((state) => state.receipts.find((item) => item.id === receiptId));

  if (!receipt) {
    return (
      <Screen>
        <EmptyState icon="receipt" title="Receipt not found" body="Scan or upload a receipt before opening review." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <AppText variant="hero">Review receipt</AppText>
        <AppText muted>Confirm AI/OCR output before turning it into a personal or group expense.</AppText>
      </View>
      <Card style={styles.card}>
        <View>
          <AppText variant="caption" muted>
            Merchant
          </AppText>
          <AppText variant="title">{receipt.merchant ?? "Unknown merchant"}</AppText>
        </View>
        <View>
          <AppText variant="caption" muted>
            Total
          </AppText>
          <MoneyAmount amountMinor={receipt.totalAmountMinor ?? 0} currency={receipt.currency} />
        </View>
        {receipt.parsedItems.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <AppText>{item.label}</AppText>
            <MoneyAmount amountMinor={item.amountMinor} currency={receipt.currency} size="body" />
          </View>
        ))}
      </Card>
      <Button
        icon="checkmark-circle"
        onPress={() => {
          Alert.alert("Receipt ready", "This receipt can now be converted into an expense from the Add Expense flow.");
          router.back();
        }}
      >
        Convert to personal expense
      </Button>
      <Button variant="secondary" icon="people" onPress={() => router.push("/modals/smart-receipt-split")}>
        Convert to split expense
      </Button>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  }
});
