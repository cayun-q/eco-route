import type { EmissionFactor, TransportMode } from "./types";

/** kg CO₂e from distance and a factor table row. Never invents g/km. */
export function kgFromDistance(distanceKm: number, gPerKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error("distanceKm must be a finite non-negative number");
  }
  if (!Number.isFinite(gPerKm) || gPerKm < 0) {
    throw new Error("gPerKm must be a finite non-negative number from the factor table");
  }
  return round3((distanceKm * gPerKm) / 1000);
}

export function factorForMode(
  factors: EmissionFactor[],
  mode: TransportMode,
): EmissionFactor {
  const row = factors.find((f) => f.mode === mode);
  if (!row) {
    throw new Error(`No emission factor for mode "${mode}"`);
  }
  return row;
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
