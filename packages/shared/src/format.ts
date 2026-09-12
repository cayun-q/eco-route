import type { FactorSubtype, TravelMode } from "./types";

export function gramsToDisplay(grams: number): { value: string; unit: string } {
  if (grams >= 1_000_000) {
    return { value: (grams / 1_000_000).toFixed(2), unit: "t CO₂e" };
  }
  if (grams >= 1000) {
    return { value: (grams / 1000).toFixed(2), unit: "kg CO₂e" };
  }
  return { value: Math.round(grams).toString(), unit: "g CO₂e" };
}

export function formatEmissions(grams: number): string {
  const { value, unit } = gramsToDisplay(grams);
  return `${value} ${unit}`;
}

export function modeLabel(mode: TravelMode): string {
  switch (mode) {
    case "car":
      return "Car";
    case "plane":
      return "Plane";
    case "train":
      return "Train";
  }
}

export function subtypeLabel(subtype: FactorSubtype): string {
  switch (subtype) {
    case "petrol":
      return "Petrol";
    case "ev":
      return "Electric";
    case "short_haul":
      return "Short-haul";
    case "long_haul":
      return "Long-haul";
    case "diesel":
      return "Diesel";
    case "electric":
      return "Electric";
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

export function formatMiles(miles: number): string {
  return `${miles.toFixed(miles >= 100 ? 0 : 1)} mi`;
}

/** Rough household-electricity equivalent for storytelling, not a scientific claim. */
export function householdDayEquivalent(grams: number): number {
  const gramsPerHouseholdDay = 12_000;
  return Math.round((grams / gramsPerHouseholdDay) * 10) / 10;
}
