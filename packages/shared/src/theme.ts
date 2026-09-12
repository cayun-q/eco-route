export const colors = {
  paper: "#F2EEE4",
  paperDeep: "#E6E0D2",
  moss: "#4A6741",
  mossInk: "#2E4029",
  ink: "#1C1A16",
  inkMuted: "#5C574E",
  line: "#C9C2B2",
  danger: "#8C3A2F",
  car: "#6E7340",
  plane: "#A65D3F",
  train: "#3D5560",
  white: "#FBF8F1",
  warnSoft: "#F6E6D8",
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
