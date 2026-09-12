import type { TransportMode } from "./types";

export const ECO_SCORE_FLOOR = 30;
export const SCORE_UI_BASELINES_G_PER_KM: Record<Exclude<TransportMode, "plane">, number> = {
  car: 171,
  ev: 45,
  bus: 89,
  bike: 0,
  walk: 0,
};

export type EcoScoreCandidate = {
  key: string;
  co2eKg: number;
};

/**
 * Relative Eco-Scores for the viable options for one origin/destination pair.
 * The cleanest viable option receives 100 and the highest-emission viable
 * option receives the floor (30). Options between them are linearly scaled by
 * total trip CO2e, so a long trip does not force every mode toward the floor.
 */
export function calculateComparativeEcoScores(
  candidates: EcoScoreCandidate[],
): Record<string, number> {
  const valid = candidates.filter(
    (candidate) => Number.isFinite(candidate.co2eKg) && candidate.co2eKg >= 0,
  );
  if (!valid.length) return {};

  const values = valid.map((candidate) => candidate.co2eKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return Object.fromEntries(
    valid.map((candidate) => {
      if (span < 1e-9) return [candidate.key, 100];
      const relative = (candidate.co2eKg - min) / span;
      const score = 100 - relative * (100 - ECO_SCORE_FLOOR);
      return [candidate.key, Math.round(Math.min(100, Math.max(ECO_SCORE_FLOOR, score)))];
    }),
  );
}

/**
 * Standalone fallback used when there is no comparable set (for example a
 * manual mixed itinerary). It scores carbon intensity only, rather than total
 * trip carbon, so distance alone cannot collapse the score.
 */
export function calculateEcoScore(gPerKm: number, maxGPerKm = 245.87): number {
  const intensity = Math.max(0, Number(gPerKm) || 0);
  const relative = Math.min(1, intensity / Math.max(1, maxGPerKm));
  const raw = 100 - relative * (100 - ECO_SCORE_FLOOR);
  return Math.round(Math.min(100, Math.max(ECO_SCORE_FLOOR, raw)));
}
