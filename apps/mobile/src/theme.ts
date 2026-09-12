export const lightColors = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F0FDFA",
  ink: "#0F172A",
  muted: "#64748B",
  line: "#99F6E4",
  accent: "#0F766E",
  accentSoft: "#CCFBF1",
  accentText: "#134E4A",
  accentPressed: "#0D9488",
  warn: "#B8872F",
  warnSoft: "#FEF3C7",
  danger: "#B91C1C",
  clay: "#B45309",
  white: "#FFFFFF",
  mode: { car: "#475569", ev: "#0F766E", bus: "#0891B2", bike: "#16A34A", walk: "#22C55E", plane: "#D97706" },
} as const;

export const darkColors = {
  bg: "#17191C",
  surface: "#202327",
  surfaceMuted: "#292D31",
  ink: "#F1F3F2",
  muted: "#A8AEB0",
  line: "#3A3F44",
  accent: "#4F8F68",
  accentSoft: "#26362D",
  accentText: "#9FD0AF",
  accentPressed: "#5C9D75",
  warn: "#D0A653",
  warnSoft: "#3A3426",
  danger: "#E07B7B",
  clay: "#C98665",
  white: "#FFFFFF",
  mode: { car: "#A8AEB0", ev: "#5E9B73", bus: "#6FA58A", bike: "#78B88A", walk: "#91C99C", plane: "#C98665" },
} as const;

export type ThemeColors = typeof lightColors;
export type ResolvedTheme = "light" | "dark";
export type ThemePreference = ResolvedTheme | "system";

export function colorsForTheme(theme: ResolvedTheme): ThemeColors {
  return (theme === "dark" ? darkColors : lightColors) as ThemeColors;
}

export const colors = lightColors;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { card: 16, chip: 999, button: 9 } as const;
export const type = {
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_600SemiBold_Italic",
  body: "IBMPlexSans_400Regular",
  bodyMed: "IBMPlexSans_500Medium",
  bodyBold: "IBMPlexSans_600SemiBold",
} as const;

export function shadowFor(colors: ThemeColors) {
  return { hard: { shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 } } as const;
}

export const shadow = shadowFor(lightColors);
export const fontsFallback = { display: "Georgia", body: "system-ui" };
