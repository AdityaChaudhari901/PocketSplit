export const motion = {
  fast: 160,
  base: 220,
  slow: 360,
  spring: {
    damping: 16,
    stiffness: 180,
    mass: 0.8
  },
  pressScale: 0.96,
  activeScale: 1.04
} as const;
