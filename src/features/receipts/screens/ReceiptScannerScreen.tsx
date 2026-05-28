import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { PaywallCard } from "@/components/cards/PaywallCard";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { spacing } from "@/lib/theme";
import { buildReceiptDraft, pickReceiptImage } from "@/services/receipt.service";
import { canUseFeature } from "@/services/entitlement.service";
import { useAppStore } from "@/store/app.store";

export const ReceiptScannerScreen = () => {
  const router = useRouter();
  const state = useAppStore();
  const addReceipt = useAppStore((store) => store.addReceipt);
  const consumeFeatureUsage = useAppStore((store) => store.consumeFeatureUsage);
  const [loading, setLoading] = useState(false);
  const canScan = canUseFeature(state.entitlement, "receipt_scan");

  const scan = async () => {
    if (!canScan) {
      Alert.alert("Receipt limit reached", "Upgrade to Pro for unlimited receipt scans.");
      return;
    }

    setLoading(true);
    try {
      const imagePath = await pickReceiptImage();
      if (!imagePath) {
        return;
      }
      const receipt = await buildReceiptDraft({ ownerId: state.profile.id, storagePath: imagePath });
      addReceipt(receipt);
      consumeFeatureUsage("receipt_scan");
      router.push(`/modals/receipt-review?receiptId=${receipt.id}`);
    } catch (error) {
      Alert.alert("Receipt scan failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Receipt scanner</AppText>
        <AppText muted>Upload a receipt image, parse it server-side or in mock mode, then review before saving.</AppText>
      </View>
      {!canScan ? <PaywallCard title="Receipt scan limit reached" body="Free users get limited scans. Upgrade for unlimited parsing and smart split receipts." /> : null}
      <Card style={styles.card}>
        <AppText variant="subtitle">MVP receipt flow</AppText>
        <AppText muted>1. Pick receipt image. 2. Store receipt metadata. 3. Parse merchant, items, taxes, and total. 4. Convert to personal or split expense.</AppText>
        <Button onPress={scan} loading={loading} icon="scan">
          Upload receipt
        </Button>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  }
});
