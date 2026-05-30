export const fontFamilies = {
  system: undefined
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800"
} as const;

export const textStyles = {
  hero: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
    letterSpacing: 0
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: fontWeights.bold,
    letterSpacing: 0
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
    letterSpacing: 0
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
    letterSpacing: 0
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeights.bold,
    letterSpacing: 0
  },
  dockLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: fontWeights.bold,
    letterSpacing: 0
  },
  moneyHero: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: fontWeights.heavy,
    letterSpacing: 0
  }
} as const;
