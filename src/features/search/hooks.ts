import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { countActiveSearchFilters, searchExpenses, type SearchParams } from "@/features/search/searchService";
import { useAppStore } from "@/store/app.store";

export const searchQueryKey = (params: SearchParams, signature: string) => ["search-expenses", params, signature] as const;

export const useDebouncedValue = <Value>(value: Value, delayMs = 300): Value => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
};

export const useSearchExpenses = (params: SearchParams) => {
  const profileId = useAppStore((state) => state.profile.id);
  const authMode = useAppStore((state) => state.authMode);
  const transactions = useAppStore((state) => state.transactions);
  const expenseTags = useAppStore((state) => state.expenseTags);
  const debouncedQuery = useDebouncedValue(params.query ?? "", 300);
  const debouncedParams = useMemo(() => ({ ...params, query: debouncedQuery, page: params.page ?? 1 }), [debouncedQuery, params]);
  const signature = useMemo(() => {
    const transactionSignature = transactions.map((transaction) => `${transaction.id}:${transaction.updatedAt}:${transaction.deletedAt ?? ""}`).join("|");
    const tagSignature = expenseTags.map((item) => `${item.expenseId}:${item.tagId}`).join("|");
    return `${authMode ?? "none"}:${profileId}:${transactionSignature}:${tagSignature}`;
  }, [authMode, expenseTags, profileId, transactions]);

  return useQuery({
    queryKey: searchQueryKey(debouncedParams, signature),
    queryFn: async () => {
      if (authMode === "supabase") {
        return searchExpenses(debouncedParams);
      }

      return searchExpenses(debouncedParams, {
        userId: profileId,
        transactions,
        expenseTags
      });
    },
    enabled: Boolean(profileId)
  });
};

export const useFilterState = (initialFilters: SearchParams = {}) => {
  const [filters, setFilters] = useState<SearchParams>({ sortBy: "date_desc", ...initialFilters });

  const setFilter = <Key extends keyof SearchParams>(key: Key, value: SearchParams[Key]) => {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const clearFilter = (key: keyof SearchParams) => {
    setFilters((current) => {
      const next = { ...current, page: 1 };
      delete next[key];
      return next;
    });
  };

  const clearAllFilters = () => {
    setFilters((current) => ({ sortBy: current.sortBy ?? "date_desc", page: 1, limit: current.limit }));
  };

  const activeFilterCount = countActiveSearchFilters(filters);

  return {
    filters,
    setFilters,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount
  };
};
