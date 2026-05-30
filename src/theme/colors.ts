export const brandColors = {
  ink: "#07111F",
  slate: "#667085",
  cloud: "#F5F8FC",
  surface: "#FFFFFF",
  blue: "#1769E0",
  blueSoft: "#EAF3FF",
  blueGlass: "rgba(23, 105, 224, 0.12)",
  green: "#059669",
  greenSoft: "#DDF8EA",
  red: "#DC3E53",
  redSoft: "#FFE3E8",
  amber: "#B7791F",
  amberSoft: "#FFF4D6",
  violet: "#6D5DF6",
  violetSoft: "#ECEBFF"
} as const;

export const lightGlassColors = {
  canvas: "#F5F8FC",
  card: "rgba(255, 255, 255, 0.74)",
  cardStrong: "rgba(255, 255, 255, 0.88)",
  dock: "rgba(255, 255, 255, 0.78)",
  overlay: "rgba(255, 255, 255, 0.58)",
  border: "rgba(17, 24, 39, 0.10)",
  borderStrong: "rgba(23, 105, 224, 0.22)",
  shadow: "rgba(15, 23, 42, 0.14)",
  highlight: "rgba(255, 255, 255, 0.92)"
} as const;

export const darkGlassColors = {
  canvas: "#080B10",
  card: "rgba(16, 21, 29, 0.72)",
  cardStrong: "rgba(27, 36, 48, 0.84)",
  dock: "rgba(16, 21, 29, 0.80)",
  overlay: "rgba(8, 11, 16, 0.58)",
  border: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(95, 168, 255, 0.26)",
  shadow: "rgba(0, 0, 0, 0.34)",
  highlight: "rgba(255, 255, 255, 0.10)"
} as const;

export const financeColors = {
  income: brandColors.green,
  incomeSoft: brandColors.greenSoft,
  expense: brandColors.red,
  expenseSoft: brandColors.redSoft,
  neutral: brandColors.blue,
  neutralSoft: brandColors.blueSoft,
  warning: brandColors.amber,
  warningSoft: brandColors.amberSoft,
  premium: brandColors.violet,
  premiumSoft: brandColors.violetSoft
} as const;

export const dockColors = {
  activeBackground: brandColors.blue,
  activeForeground: "#FFFFFF",
  inactiveForeground: "#667085",
  addBackground: "#1769E0",
  addForeground: "#FFFFFF"
} as const;

export type GlassMode = "light" | "dark";

export const getGlassColors = (mode: GlassMode) => (mode === "dark" ? darkGlassColors : lightGlassColors);
