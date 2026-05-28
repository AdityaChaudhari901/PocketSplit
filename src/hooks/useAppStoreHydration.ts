import { useEffect, useState } from "react";

import { useAppStore } from "@/store/app.store";

export const useAppStoreHydration = (): boolean => {
  const [hasHydrated, setHasHydrated] = useState(useAppStore.persist.hasHydrated());

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return undefined;
    }

    return useAppStore.persist.onFinishHydration(() => setHasHydrated(true));
  }, []);

  return hasHydrated;
};
