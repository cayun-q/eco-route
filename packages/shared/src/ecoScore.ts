import type { TransportMode } from "./types";

export const SCORE_UI_BASELINES_G_PER_KM: Record<Exclude<TransportMode, "plane">, number> = {
  car: 171,
  ev: 45,
  bus: 89,
  bike: 0,
  walk: 0,
};

const MAX_REFERENCE_G_PER_KM = 245.87;
const DISTANCE_SCALE_KM = 750;
const RELATIVE_WEIGHT = 0.55;
const ABSOLUTE_WEIGHT = 1 - RELATIVE_WEIGHT;

export type EcoScoreCandidate = {
  key: string;
  co2eKg: number;
  distanceKm?: number;
  gPerKm?: number;
};

function clampScore(value: number): number {
  return Math.round(Math.min(99, Math.max(1, value)));
}

function absoluteImpactScore(candidate: EcoScoreCandidate): number {
  const distanceKm = Math.max(0, Number(candidate.distanceKm) || 0);
  const inferredGPerKm = distanceKm > 0
    ? (Math.max(0, Number(candidate.co2eKg) || 0) * 1000) / distanceKm
    : 0;
  const gPerKm = Math.max(0, Number(candidate.gPerKm) || inferredGPerKm);

  // Distance matters, but with diminishing returns: doubling an already-long
  // trip should not halve the score again. Carbon intensity controls how much
  // of that distance burden turns into an emissions penalty.
  const distanceBurden = 1 - Math.exp(-distanceKm / DISTANCE_SCALE_KM);
  const intensityBurden = Math.min(1, gPerKm / MAX_REFERENCE_G_PER_KM);
  const severity = intensityBurden * (0.3 + 0.7 * distanceBurden);
  return 100 * (1 - severity);
}

/**
 * Hybrid Eco-Score for one origin/destination pair.
 *
 * 55% comes from how the option compares with the other meaningful modes for
 * the same trip. 45% comes from its own absolute impact, using both distance
 * and carbon intensity. This prevents the best option from automatically being
 * 100, the worst from automatically being 30, and still makes long trips score
 * lower than otherwise-identical short trips.
 */
export function calculateComparativeEcoScores(
  candidates: EcoScoreCandidate[],
): Record<string, number> {
  const valid = candidates.filter(
    (candidate) =>
      Number.isFinite(candidate.co2eKg) &&
      candidate.co2eKg >= 0 &&
      (candidate.distanceKm == null || (Number.isFinite(candidate.distanceKm) && candidate.distanceKm >= 0)),
  );
  if (!valid.length) return {};

  const values = valid.map((candidate) => candidate.co2eKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return Object.fromEntries(
    valid.map((candidate) => {
      // Relative component intentionally uses 90..20 instead of 100..0 so the
      // comparison influences the score without completely defining it.
      const relativeScore = span < 1e-9
        ? 55
        : 90 - ((candidate.co2eKg - min) / span) * 70;
      const absoluteScore = absoluteImpactScore(candidate);
      return [
        candidate.key,
        clampScore(relativeScore * RELATIVE_WEIGHT + absoluteScore * ABSOLUTE_WEIGHT),
      ];
    }),
  );
}

/** Standalone fallback for manual/mixed itineraries when no comparison pool exists. */
export function calculateEcoScore(gPerKm: number, distanceKm = 0): number {
  return clampScore(absoluteImpactScore({ key: "standalone", co2eKg: (gPerKm * distanceKm) / 1000, gPerKm, distanceKm }));
}
