import { useColorScheme } from "react-native";

import { useAppStore, type ThemeMode } from "@/store/app.store";

export const lightTheme = {
  mode: "light",
  colors: {
    canvas: "#F6F8FB",
    surface: "#FFFFFF",
    surfaceMuted: "#EDF2F7",
    surfaceRaised: "#FFFFFF",
    text: "#101828",
    subtext: "#667085",
    border: "rgba(16, 24, 40, 0.08)",
    primary: "#1769E0",
    onPrimary: "#FFFFFF",
    primarySoft: "#EAF3FF",
    primaryBorder: "rgba(23, 105, 224, 0.18)",
    success: "#059669",
    successSoft: "#DDF8EA",
    successBorder: "rgba(5, 150, 105, 0.2)",
    warning: "#B7791F",
    warningSoft: "#FFF4D6",
    warningBorder: "rgba(183, 121, 31, 0.22)",
    danger: "#DC3E53",
    onDanger: "#FFFFFF",
    dangerSoft: "#FFE3E8",
    dangerBorder: "rgba(220, 62, 83, 0.2)",
    aiStart: "#1769E0",
    aiEnd: "#059669",
    shadow: "rgba(16, 24, 40, 0.08)"
  }
} as const;

export const darkTheme = {
  mode: "dark",
  colors: {
    canvas: "#080B10",
    surface: "#10151D",
    surfaceMuted: "#161D27",
    surfaceRaised: "#1B2430",
    text: "#F4F7FA",
    subtext: "#9AA6B2",
    border: "rgba(255, 255, 255, 0.07)",
    primary: "#5FA8FF",
    onPrimary: "#08111C",
    primarySoft: "rgba(95, 168, 255, 0.14)",
    primaryBorder: "rgba(95, 168, 255, 0.24)",
    success: "#63E6A2",
    successSoft: "rgba(99, 230, 162, 0.14)",
    successBorder: "rgba(99, 230, 162, 0.24)",
    warning: "#F6C76A",
    warningSoft: "rgba(246, 199, 106, 0.14)",
    warningBorder: "rgba(246, 199, 106, 0.24)",
    danger: "#FF6B7D",
    onDanger: "#19090D",
    dangerSoft: "rgba(255, 107, 125, 0.14)",
    dangerBorder: "rgba(255, 107, 125, 0.24)",
    aiStart: "#5FA8FF",
    aiEnd: "#63E6A2",
    shadow: "rgba(0, 0, 0, 0.35)"
  }
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;

export const resolveThemeMode = (themeMode: ThemeMode, systemScheme: "light" | "dark" | null | undefined): "light" | "dark" => {
  if (themeMode === "light" || themeMode === "dark") {
    return themeMode;
  }

  return systemScheme === "dark" ? "dark" : "light";
};

export const useAppTheme = (): AppTheme => {
  const scheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);
  return resolveThemeMode(themeMode, scheme) === "dark" ? darkTheme : lightTheme;
};
