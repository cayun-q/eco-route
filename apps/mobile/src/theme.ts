export const colors = {
  bg: "#F2EEE4",
  surface: "#F7F4EC",
  surfaceMuted: "#E8E2D6",
  ink: "#2C2A26",
  muted: "#6B6558",
  line: "#D4CDBF",
  accent: "#4A6741",
  accentSoft: "#DDE5D4",
  accentText: "#2F3F2C",
  accentPressed: "#3A5234",
  warn: "#B5812C",
  warnSoft: "#EFE0C4",
  danger: "#9B2C2C",
  clay: "#A65D3F",
  white: "#FFFFFF",
  mode: {
    car: "#6E7340",
    plane: "#A65D3F",
    train: "#3D5560",
  },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  card: 8,
  chip: 8,
  button: 8,
} as const;

export const type = {
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_600SemiBold_Italic",
  body: "IBMPlexSans_400Regular",
  bodyMed: "IBMPlexSans_500Medium",
  bodyBold: "IBMPlexSans_600SemiBold",
} as const;

export const shadow = {
  hard: {
    shadowColor: colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 2,
  },
} as const;

export const fontsFallback = {
  display: "Georgia",
  body: "system-ui",
};
