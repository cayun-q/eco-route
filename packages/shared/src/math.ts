import type { EstimatedLeg, TripTotals } from "./types";

export function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function sumTotals(legs: Pick<EstimatedLeg, "distanceKm" | "durationMin" | "co2eKg">[]): TripTotals {
  return {
    distanceKm: round(
      legs.reduce((sum, leg) => sum + leg.distanceKm, 0),
      2,
    ),
    durationMin: round(
      legs.reduce((sum, leg) => sum + leg.durationMin, 0),
      1,
    ),
    co2eKg: round(
      legs.reduce((sum, leg) => sum + leg.co2eKg, 0),
      3,
    ),
  };
}

export function tripTitle(legs: { origin: { label: string }; destination: { label: string } }[]): string {
  if (legs.length === 0) return "Untitled trip";
  const first = legs[0].origin.label;
  const last = legs[legs.length - 1].destination.label;
  if (legs.length === 1) return `${first} → ${last}`;
  return `${first} → ${last} · ${legs.length} legs`;
}
