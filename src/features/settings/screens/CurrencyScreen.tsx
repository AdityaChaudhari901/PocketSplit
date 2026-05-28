import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TextField } from "@/components/ui/TextField";
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
      router.back();
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
            router.back();
          }
        }
      ]
    );
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed ? styles.pressed : null
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
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

      <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Search by code or country currency" leftIcon="search" autoCapitalize="characters" />

      <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {visibleCurrencies.map((currency) => {
          const selected = currency.code === profileCurrency;
          const minorUnit = getCurrencyMinorUnit(currency.code);
          return (
            <Pressable
              key={currency.code}
              accessibilityRole="button"
              accessibilityLabel={`Use ${currency.name}`}
              onPress={() => chooseCurrency(currency.code)}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <View style={[styles.codeBadge, { backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceMuted }]}>
                <AppText variant="caption" style={{ color: selected ? theme.colors.primary : theme.colors.text }}>
                  {currency.code}
                </AppText>
              </View>
              <View style={styles.copy}>
                <AppText variant="body">{currency.name}</AppText>
                <AppText variant="caption" muted>
                  {minorUnit === 0 ? "No decimals" : `${minorUnit} decimal places`}
                </AppText>
              </View>
              {selected ? <StatusBadge label="Selected" tone="ai" /> : <Ionicons name="chevron-forward" size={18} color={theme.colors.subtext} />}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: spacing.sm,
    gap: spacing.lg
  },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    flex: 1,
    textAlign: "center"
  },
  headerSpacer: {
    width: 56,
    height: 56
  },
  heroCopy: {
    gap: spacing.xs
  },
  group: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden"
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  codeBadge: {
    width: 54,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  pressed: {
    opacity: 0.72
  }
});
