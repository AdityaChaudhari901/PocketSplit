import { Alert, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { buildTransactionsCsv, queuePdfExport } from "@/services/export.service";
import { spacing } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const DataExportScreen = () => {
  const transactions = useAppStore((state) => state.transactions);
  return (
    <Screen>
      <View>
        <AppText variant="hero">Data export</AppText>
        <AppText muted>Export architecture for CSV/PDF. Production should stream files through a secure backend job.</AppText>
      </View>
      <Card style={styles.card}>
        <Button
          icon="document-text"
          onPress={() => {
            const csv = buildTransactionsCsv(transactions);
            Alert.alert("CSV generated", `${csv.split("\n").length - 1} transactions included.`);
          }}
        >
          Generate CSV
        </Button>
        <Button
          variant="secondary"
          icon="document"
          onPress={async () => {
            const result = await queuePdfExport();
            Alert.alert("PDF export", result.message);
          }}
        >
          Queue PDF export
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
