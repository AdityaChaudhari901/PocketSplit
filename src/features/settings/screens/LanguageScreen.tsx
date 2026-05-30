import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { SearchPill } from "@/components/ui/SearchPill";
import { useTranslation } from "@/lib/i18n";
import { APP_LANGUAGE_OPTIONS, type AppLanguageCode } from "@/lib/languages";
import { radius, spacing, useAppTheme } from "@/lib/theme";
import { useAppStore } from "@/store/app.store";

export const LanguageScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const appLanguage = useAppStore((state) => state.appLanguage);
  const setAppLanguage = useAppStore((state) => state.setAppLanguage);

  const visibleLanguages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return APP_LANGUAGE_OPTIONS;
    }

    return APP_LANGUAGE_OPTIONS.filter((language) => {
      const name = language.code === "system" ? t("language.option.system.name") : language.name;
      const nativeName = language.code === "system" ? t("language.option.system.nativeName") : language.nativeName;
      const region = language.code === "system" ? t("language.option.system.region") : language.region;

      return (
        language.code.toLowerCase().includes(normalizedQuery) ||
        name.toLowerCase().includes(normalizedQuery) ||
        nativeName.toLowerCase().includes(normalizedQuery) ||
        region.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, t]);

  const chooseLanguage = (language: AppLanguageCode) => {
    setAppLanguage(language);
    handleBack();
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
          accessibilityLabel={t("common.goBack")}
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          <View style={[styles.backButton, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </View>
        </Pressable>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("language.title")}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroCopy}>
        <AppText variant="title">{t("language.chooseTitle")}</AppText>
        <AppText muted>{t("language.description")}</AppText>
      </View>

      <SearchPill accessibilityLabel={t("language.searchPlaceholder")} label={t("common.search")} value={query} onChangeText={setQuery} placeholder={t("language.searchPlaceholder")} />

      <View style={[styles.group, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
        {visibleLanguages.map((language) => {
          const selected = language.code === appLanguage;
          const name = language.code === "system" ? t("language.option.system.name") : language.name;
          const nativeName = language.code === "system" ? t("language.option.system.nativeName") : language.nativeName;
          const region = language.code === "system" ? t("language.option.system.region") : language.region;
          return (
            <Pressable
              key={language.code}
              accessibilityRole="button"
              accessibilityLabel={t("language.useLanguage", { language: name })}
              onPress={() => chooseLanguage(language.code)}
              style={({ pressed }) => (pressed ? styles.pressed : null)}
            >
              <View style={styles.row}>
                <View style={[styles.codeBadge, { backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceMuted }]}>
                  <AppText variant="caption" style={[styles.codeText, { color: selected ? theme.colors.primary : theme.colors.text }]}>
                    {language.code === "system" ? "Aa" : language.code.toUpperCase()}
                  </AppText>
                </View>
                <View style={styles.copy}>
                  <AppText variant="body" numberOfLines={1}>
                    {name}
                  </AppText>
                  <AppText variant="caption" muted numberOfLines={1}>
                    {nativeName} • {region}
                  </AppText>
                </View>
                {selected ? (
                  <View style={[styles.selectedPill, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="checkmark" size={14} color={theme.colors.primary} />
                    <AppText variant="caption" style={{ color: theme.colors.primary }}>
                      {t("common.selected")}
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
