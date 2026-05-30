import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { SearchPill } from "@/components/ui/SearchPill";
import { getCurrencyMinorUnit, SUPPORTED_CURRENCIES, type SupportedCurrencyCode } from "@/lib/currencies";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const CurrencyScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const [query, setQuery] = useState("");
  const profileCurrency = useAppStore((state) => state.profile.currency);
  const setCurrency = useAppStore((state) => state.setCurrency);

  const visibleCurrencies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return SUPPORTED_CURRENCIES;
    }

    return SUPPORTED_CURRENCIES.filter(
      (currency) => currency.code.toLowerCase().includes(normalizedQuery) || currency.name.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  const chooseCurrency = (currency: SupportedCurrencyCode) => {
    if (currency === profileCurrency) {
      handleBack();
      return;
    }

    Alert.alert(
      `Use ${currency}?`,
      "PocketSplit is single-currency right now. This updates the display currency for all local money records; it does not convert existing amounts.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use currency",
          onPress: () => {
            setCurrency(currency);
            handleBack();
          }
        }
      ]
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/modals/settings");
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          <View style={[styles.backButton, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </View>
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>
          Currency
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroCopy}>
        <AppText variant="title">Choose display currency</AppText>
        <AppText muted>All supported ISO currencies are listed. Amounts stay the same; only the currency unit changes.</AppText>
      </View>

      <SearchPill
        accessibilityLabel="Search by code or country currency"
        autoCapitalize="characters"
        label="Search"
        placeholder="Search by code or country currency"
        value={query}
        onChangeText={setQuery}
      />

      <View style={[styles.group, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
        {visibleCurrencies.map((currency) => {
          const selected = currency.code === profileCurrency;
          const minorUnit = getCurrencyMinorUnit(currency.code);
          return (
            <Pressable
              key={currency.code}
              accessibilityRole="button"
              accessibilityLabel={`Use ${currency.name}`}
              onPress={() => chooseCurrency(currency.code)}
              style={({ pressed }) => (pressed ? styles.pressed : null)}
            >
              <View style={styles.row}>
                <View style={[styles.codeBadge, { backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceMuted }]}>
                  <AppText variant="caption" style={[styles.codeText, { color: selected ? theme.colors.primary : theme.colors.text }]}>
                    {currency.code}
                  </AppText>
                </View>
                <View style={styles.copy}>
                  <AppText variant="body" numberOfLines={1}>
                    {currency.name}
                  </AppText>
                  <AppText variant="caption" muted numberOfLines={1}>
                    {minorUnit === 0 ? "No decimals" : `${minorUnit} decimal places`}
                  </AppText>
                </View>
                {selected ? (
                  <View style={[styles.selectedPill, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="checkmark" size={14} color={theme.colors.primary} />
                    <AppText variant="caption" style={{ color: theme.colors.primary }}>
                      Selected
                    </AppText>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: 20
  },
  header: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  headerSpacer: {
    width: 56,
    height: 56
  },
  heroCopy: {
    gap: spacing.sm
  },
  group: {
    borderRadius: 26,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 2
  },
  row: {
    width: "100%",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  codeBadge: {
    width: 58,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  codeText: {
    fontWeight: "800"
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  selectedPill: {
    minHeight: 30,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  pressed: {
    opacity: 0.72
  }
});
