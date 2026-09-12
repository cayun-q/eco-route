export const colors = {
  bg: "#F3F6F1",
  surface: "#FFFFFF",
  surfaceMuted: "#E7EEE6",
  ink: "#14241C",
  muted: "#5D7266",
  line: "#D5E0D6",
  accent: "#1B7A4E",
  accentSoft: "#D8F3E4",
  accentText: "#0F3D2E",
  car: "#1F6FEB",
  plane: "#C2410C",
  train: "#6D28D9",
  danger: "#8C3A2F",
  warnSoft: "#F6E6D8",
  // compile aliases — mapped to the forest palette, not moss/olive/clay
  paper: "#F3F6F1",
  paperDeep: "#E7EEE6",
  moss: "#1B7A4E",
  mossInk: "#0F3D2E",
  inkMuted: "#5D7266",
  white: "#FFFFFF",
} as const;

export const modes = ["car", "plane", "train"] as const;
export type TravelMode = (typeof modes)[number];

export const modeColor: Record<TravelMode, string> = {
  car: colors.car,
  plane: colors.plane,
  train: colors.train,
};

export const radius = 8;

export const shadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
} as const;
