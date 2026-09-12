import type { TransportMode } from "@carbonroute/shared";

export type MeasurementSystem = "metric" | "imperial";
export type DisplayPrecision = "simple" | "detailed";

const ROAD_WORDS = /\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|court|ct|circle|cir|way|highway|hwy|parkway|pkwy|place|pl|terrace|ter|trail|trl)\.?$/i;
const KM_TO_MILES = 0.6213711922;
const KG_TO_POUNDS = 2.2046226218;
const GRAMS_PER_POUND = 453.59237;
const KM_PER_MILE = 1.609344;
let defaultMeasurementSystem: MeasurementSystem = "metric";
let defaultDisplayPrecision: DisplayPrecision = "simple";
let defaultShowDrivingComparison = true;

export function setDefaultMeasurementSystem(system: MeasurementSystem): void {
  defaultMeasurementSystem = system;
}

export function setDefaultDisplayPrecision(precision: DisplayPrecision): void {
  defaultDisplayPrecision = precision;
}

export function setDefaultShowDrivingComparison(show: boolean): void {
  defaultShowDrivingComparison = show;
}

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

function formatMass(value: number, unit: "kg" | "lb", precision: DisplayPrecision): string {
  if (precision === "simple") {
    if (value < 10) return `${value.toFixed(1)} ${unit}`;
    return `${Math.round(value)} ${unit}`;
  }
  if (value >= 100) return `${value.toFixed(1)} ${unit}`;
  return `${value.toFixed(2)} ${unit}`;
}

export function formatKg(
  kg: number,
  system: MeasurementSystem = defaultMeasurementSystem,
  precision: DisplayPrecision = defaultDisplayPrecision,
): string {
  return system === "imperial"
    ? formatMass(kg * KG_TO_POUNDS, "lb", precision)
    : formatMass(kg, "kg", precision);
}

export function formatKm(
  km: number,
  system: MeasurementSystem = defaultMeasurementSystem,
  precision: DisplayPrecision = defaultDisplayPrecision,
): string {
  const value = system === "imperial" ? km * KM_TO_MILES : km;
  const unit = system === "imperial" ? "mi" : "km";
  if (precision === "simple") {
    if (value < 10) return `${value.toFixed(1)} ${unit}`;
    return `${Math.round(value)} ${unit}`;
  }
  return `${value.toFixed(1)} ${unit}`;
}

export function formatFactor(
  gPerKm: number,
  system: MeasurementSystem = defaultMeasurementSystem,
  precision: DisplayPrecision = defaultDisplayPrecision,
): string {
  if (system === "imperial") {
    const lbPerMile = (gPerKm * KM_PER_MILE) / GRAMS_PER_POUND;
    return `${lbPerMile.toFixed(precision === "simple" ? 2 : 3)} lb/mi`;
  }
  return `${precision === "simple" ? Math.round(gPerKm) : gPerKm.toFixed(1)} g/km`;
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

export function vsDrivingCopy(
  vsDrivingKg: number | null | undefined,
  system: MeasurementSystem = defaultMeasurementSystem,
  precision: DisplayPrecision = defaultDisplayPrecision,
): string | null {
  if (!defaultShowDrivingComparison || vsDrivingKg == null) return null;
  const abs = Math.abs(vsDrivingKg);
  const amount = formatKg(abs, system, precision);
  if (vsDrivingKg < 0) return `${amount} less than the same trip by car`;
  if (vsDrivingKg > 0) return `${amount} more than driving`;
  return "Same CO₂e as driving this distance";
}
