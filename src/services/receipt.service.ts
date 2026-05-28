import * as ImagePicker from "expo-image-picker";

import { parseReceipt } from "@/services/ai.service";
import type { Receipt } from "@/types/domain";

export const pickReceiptImage = async (): Promise<string | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo access is required to upload a receipt.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    quality: 0.82,
    mediaTypes: ImagePicker.MediaTypeOptions.Images
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0]?.uri ?? null;
};

export const buildReceiptDraft = async ({
  ownerId,
  storagePath
}: {
  ownerId: string;
  storagePath: string;
}): Promise<Receipt> => {
  const parsed = await parseReceipt(storagePath);
  const now = new Date().toISOString();

  return {
    id: `receipt-${Date.now()}`,
    ownerId,
    storagePath,
    merchant: parsed.merchant ?? null,
    totalAmountMinor: parsed.totalAmountMinor,
    taxAmountMinor: parsed.taxAmountMinor,
    serviceChargeMinor: parsed.serviceChargeMinor,
    currency: "INR",
    parsedStatus: "parsed",
    parsedItems: parsed.items.map((item, index) => ({
      id: `receipt-item-${index}`,
      label: item.label,
      amountMinor: item.amountMinor,
      quantity: item.quantity
    })),
    createdAt: now,
    updatedAt: now,
    createdBy: ownerId
  };
};
