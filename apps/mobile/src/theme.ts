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
  bg: "#0F172A",
  surface: "#172033",
  surfaceMuted: "#123A38",
  ink: "#F8FAFC",
  muted: "#94A3B8",
  line: "#285E59",
  accent: "#14B8A6",
  accentSoft: "#163F3B",
  accentText: "#99F6E4",
  accentPressed: "#2DD4BF",
  warn: "#D0A653",
  warnSoft: "#3A3426",
  danger: "#F87171",
  clay: "#FB923C",
  white: "#FFFFFF",
  mode: { car: "#94A3B8", ev: "#2DD4BF", bus: "#22D3EE", bike: "#4ADE80", walk: "#86EFAC", plane: "#FB923C" },
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
