import { useCallback, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";

import { secureStorage } from "@/services/secure-storage.service";

const BIOMETRIC_LOCK_KEY = "moneypulse.biometric.enabled";

export const useBiometricLock = () => {
  const [isChecking, setIsChecking] = useState(false);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await secureStorage.set(BIOMETRIC_LOCK_KEY, enabled ? "true" : "false");
  }, []);

  const getBiometricEnabled = useCallback(async () => {
    return (await secureStorage.get(BIOMETRIC_LOCK_KEY)) === "true";
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const available = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!available || !enrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock MoneyPulse AI",
        cancelLabel: "Cancel",
        disableDeviceFallback: false
      });

      return result.success;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    isChecking,
    authenticate,
    setBiometricEnabled,
    getBiometricEnabled
  };
};
