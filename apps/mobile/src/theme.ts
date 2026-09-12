export const colors = {
  bg: "#F4F7F1",
  surface: "#FFFFFF",
  surfaceMuted: "#E9F0E9",
  ink: "#17352A",
  muted: "#66786E",
  line: "#CDDCCF",
  accent: "#2F6B4F",
  accentSoft: "#DCECE2",
  accentText: "#24533D",
  accentPressed: "#25583F",
  warn: "#B8872F",
  warnSoft: "#F1E6CB",
  danger: "#A33A3A",
  clay: "#A66048",
  white: "#FFFFFF",
  mode: {
    car: "#3F7658",
    plane: "#B06A45",
    train: "#45666A",
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
  card: 10,
  chip: 10,
  button: 10,
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
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
} as const;

export const fontsFallback = {
  display: "Georgia",
  body: "system-ui",
};
