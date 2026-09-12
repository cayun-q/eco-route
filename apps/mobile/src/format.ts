import type { TransportMode } from "@carbonroute/shared";

const ROAD_WORDS = /\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|court|ct|circle|cir|way|highway|hwy|parkway|pkwy|place|pl|terrace|ter|trail|trl)\.?$/i;

export function placeDisplayLabel(label: string): string {
  const parts = label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return label;

  if (/^[A-Z]{3}\s+[—-]/.test(parts[0])) {
    return parts[1] || parts[0].slice(0, 3);
  }

  for (const part of parts) {
    if (/^\d+[A-Za-z-]*$/.test(part)) continue;
    if (/^\d+\s+/.test(part)) continue;
    if (ROAD_WORDS.test(part)) continue;
    return part;
  }

  return parts[0];
}

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
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function modeLabel(mode: TransportMode): string {
  if (mode === "car") return "Car";
  if (mode === "plane") return "Plane";
  return "Train";
}

export function vsDrivingCopy(vsDrivingKg: number | null | undefined): string | null {
  if (vsDrivingKg == null) return null;
  const abs = Math.abs(vsDrivingKg);
  const amount = formatKg(abs);
  if (vsDrivingKg < 0) return `${amount} less than the same trip by car`;
  if (vsDrivingKg > 0) return `${amount} more than driving`;
  return "Same CO₂e as driving this distance";
}
