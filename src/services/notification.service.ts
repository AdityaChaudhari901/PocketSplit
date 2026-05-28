import { Platform } from "react-native";

import { formatMoney } from "@/lib/money";
import type { RecurringBill } from "@/types/domain";

type ExpoNotifications = typeof import("expo-notifications");

const ANDROID_DEV_NOTIFICATIONS_ENABLED = process.env.EXPO_PUBLIC_ENABLE_ANDROID_NOTIFICATIONS_IN_DEV === "true";

export const getNotificationRuntimeLimitation = (): string | null => {
  if (Platform.OS === "android" && process.env.NODE_ENV !== "production" && !ANDROID_DEV_NOTIFICATIONS_ENABLED) {
    return "Android notifications are disabled in Expo Go. Use a development build to test reminders on Android.";
  }

  return null;
};

const loadNotifications = async (): Promise<ExpoNotifications | null> => {
  if (getNotificationRuntimeLimitation()) {
    return null;
  }

  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
};

export const scheduleBudgetReminder = async (): Promise<string | null> => {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return null;
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "PocketSplit check-in",
      body: "Review your safe daily spend before today gets busy."
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0
    }
  });
};

export const scheduleRecurringBillReminder = async (bill: RecurringBill): Promise<string | null> => {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return null;
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const dueDate = new Date(bill.nextDueAt);
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(dueDate.getDate() - bill.remindDaysBefore);

  if (reminderDate <= new Date()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${bill.name} is coming up`,
      body: `${formatMoney(bill.amountMinor, bill.currency)} is due on ${dueDate.toLocaleDateString("en-IN")}.`
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate
    }
  });
};
