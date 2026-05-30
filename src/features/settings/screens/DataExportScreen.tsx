import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { ExportSheet } from "@/components/export/ExportSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

export const DataExportScreen = () => {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  const closeSheet = () => {
    setVisible(false);
    router.back();
  };

  return (
    <Screen>
      <View>
        <AppText variant="hero">Data export</AppText>
        <AppText muted>Export personal, group, or combined data as a CSV or PDF file.</AppText>
      </View>
      <Button icon="share-outline" onPress={() => setVisible(true)}>
        Open export options
      </Button>
      <ExportSheet visible={visible} onClose={closeSheet} />
    </Screen>
  );
};
