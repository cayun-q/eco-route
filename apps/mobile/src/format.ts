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

export function setDefaultMeasurementSystem(system: MeasurementSystem): void { defaultMeasurementSystem = system; }
export function setDefaultDisplayPrecision(precision: DisplayPrecision): void { defaultDisplayPrecision = precision; }
export function setDefaultShowDrivingComparison(show: boolean): void { defaultShowDrivingComparison = show; }

export function placeDisplayLabel(label: string): string {
  const parts = label.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return label;
  if (/^[A-Z]{3}\s+[—-]/.test(parts[0])) return parts[1] || parts[0].slice(0, 3);
  for (const part of parts) {
    if (/^\d+[A-Za-z-]*$/.test(part)) continue;
    if (/^\d+\s+/.test(part)) continue;
    if (ROAD_WORDS.test(part)) continue;
    return part;
  }
  return parts[0];
}

function formatMass(value: number, unit: "kg" | "lb", precision: DisplayPrecision): string {
  if (precision === "simple") return value < 10 ? `${value.toFixed(1)} ${unit}` : `${Math.round(value)} ${unit}`;
  return value >= 100 ? `${value.toFixed(1)} ${unit}` : `${value.toFixed(2)} ${unit}`;
}

export function formatKg(kg: number, system: MeasurementSystem = defaultMeasurementSystem, precision: DisplayPrecision = defaultDisplayPrecision): string {
  return system === "imperial" ? formatMass(kg * KG_TO_POUNDS, "lb", precision) : formatMass(kg, "kg", precision);
}

export function formatKm(km: number, system: MeasurementSystem = defaultMeasurementSystem, precision: DisplayPrecision = defaultDisplayPrecision): string {
  const value = system === "imperial" ? km * KM_TO_MILES : km;
  const unit = system === "imperial" ? "mi" : "km";
  if (precision === "simple") return value < 10 ? `${value.toFixed(1)} ${unit}` : `${Math.round(value)} ${unit}`;
  return `${value.toFixed(1)} ${unit}`;
}

export function formatFactor(gPerKm: number, system: MeasurementSystem = defaultMeasurementSystem, precision: DisplayPrecision = defaultDisplayPrecision): string {
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
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function modeLabel(mode: TransportMode): string {
  if (mode === "car") return "Driving (Car)";
  if (mode === "ev") return "Electric Vehicle (EV)";
  if (mode === "bus") return "Transit (Bus)";
  if (mode === "bike") return "Bicycle";
  if (mode === "walk") return "Walking";
  return "Plane";
}

export function comparisonCopy(
  currentMode: TransportMode,
  comparisonMode: TransportMode | null | undefined,
  vsComparisonKg: number | null | undefined,
  system: MeasurementSystem = defaultMeasurementSystem,
  precision: DisplayPrecision = defaultDisplayPrecision,
): string | null {
  if (!defaultShowDrivingComparison || comparisonMode == null || vsComparisonKg == null) return null;
  const amount = formatKg(Math.abs(vsComparisonKg), system, precision);
  const label = modeLabel(comparisonMode).toLowerCase();
  if (vsComparisonKg < 0) return `${amount} CO₂e saved vs ${label}`;
  if (vsComparisonKg > 0) return `${amount} more CO₂e than ${label}`;
  return `Same CO₂e as ${label}`;
}

export function vsDrivingCopy(vsDrivingKg: number | null | undefined, system: MeasurementSystem = defaultMeasurementSystem, precision: DisplayPrecision = defaultDisplayPrecision): string | null {
  return comparisonCopy("plane", "car", vsDrivingKg, system, precision);
}
