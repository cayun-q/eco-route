import type { TransportMode } from "./types";

export const ECO_SCORE_FLOOR = 30;
export const ECO_SCORE_REFERENCE_DISTANCE_KM = 20;
export const SCORE_UI_BASELINES_G_PER_KM: Record<Exclude<TransportMode, "plane">, number> = {
  car: 171,
  ev: 45,
  bus: 89,
  bike: 0,
  walk: 0,
};

export function calculateEcoScore(gPerKm: number, distanceKm = 0, maxGPerKm = 171): number {
  const intensity = Math.max(0, Number(gPerKm) || 0);
  const modeFactor = Math.min(1, intensity / Math.max(1, maxGPerKm));
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const distanceFactor = Math.min(1, safeDistance / ECO_SCORE_REFERENCE_DISTANCE_KM);
  const severity = modeFactor * (0.35 + 0.65 * distanceFactor);
  const raw = ECO_SCORE_FLOOR + (100 - ECO_SCORE_FLOOR) * (1 - severity);
  return Math.round(Math.min(100, Math.max(ECO_SCORE_FLOOR, raw)));
}
