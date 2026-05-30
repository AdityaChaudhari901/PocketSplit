export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  dock: 32,
  full: 999
} as const;

export const glassShadow = {
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 1,
  shadowRadius: 34,
  elevation: 10
} as const;

export const dockMetrics = {
  height: 76,
  horizontalMargin: 14,
  bottomOffset: 10,
  itemSize: 54,
  addSize: 48
} as const;
