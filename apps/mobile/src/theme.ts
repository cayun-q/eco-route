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
  warn: "#9A6B12",
  warnSoft: "#F8E7C1",
  danger: "#9B2C2C",
  car: "#1F6FEB",
  plane: "#C2410C",
  train: "#6D28D9",
  white: "#FFFFFF",
};

export const modeColor = (mode: "car" | "plane" | "train") => colors[mode];
