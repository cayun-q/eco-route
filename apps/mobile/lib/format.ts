import type { TravelMode } from "@carbonroute/shared";

export function formatKg(kg: number): string {
  if (kg >= 100) return `${Math.round(kg)} kg`;
  if (kg >= 10) return `${kg.toFixed(1)} kg`;
  return `${kg.toFixed(2)} kg`;
}

export function formatKm(km: number): string {
  if (km >= 100) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function modeLabel(mode: TravelMode): string {
  if (mode === "car") return "Car";
  if (mode === "plane") return "Plane";
  return "Train";
}

export function modeArrow(modes: TravelMode[]): string {
  return modes.map((m) => modeLabel(m)).join(" → ");
}
