import type { TransportMode } from "./types";

export const SCORE_UI_BASELINES_G_PER_KM: Record<Exclude<TransportMode, "plane">, number> = {
  car: 171,
  ev: 45,
  bus: 89,
  bike: 0,
  walk: 0,
};

const MAX_REFERENCE_G_PER_KM = 245.87;
const DEFAULT_REFERENCE_G_PER_KM = 171;
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
  const co2eKg = Math.max(0, Number(candidate.co2eKg) || 0);
  const suppliedDistance = Number(candidate.distanceKm);
  const suppliedIntensity = Number(candidate.gPerKm);

  // Route callers may only provide total CO2e. In that case, convert the
  // total back into a distance-equivalent using the standard car baseline so
  // longer trips still carry a larger absolute penalty. When route distance
  // and intensity are available, use those directly.
  const hasDistance = Number.isFinite(suppliedDistance) && suppliedDistance >= 0;
  const hasIntensity = Number.isFinite(suppliedIntensity) && suppliedIntensity >= 0;
  const distanceKm = hasDistance
    ? suppliedDistance
    : (co2eKg * 1000) / DEFAULT_REFERENCE_G_PER_KM;
  const inferredIntensity = distanceKm > 0 ? (co2eKg * 1000) / distanceKm : 0;
  const gPerKm = hasIntensity ? suppliedIntensity : inferredIntensity;

  // The distance curve saturates gradually: every extra kilometre hurts, but
  // adding 500 km to an already very long trip does not dominate the score.
  const distanceBurden = 1 - Math.exp(-distanceKm / DISTANCE_SCALE_KM);
  const intensityBurden = Math.min(1, gPerKm / MAX_REFERENCE_G_PER_KM);
  const severity = intensityBurden * (0.3 + 0.7 * distanceBurden);
  return 100 * (1 - severity);
}

/**
 * Hybrid Eco-Score for one origin/destination pair.
 *
 * 55% comes from how an option compares with the other meaningful modes for
 * the same trip. 45% comes from its own absolute trip impact, where distance
 * and carbon intensity both lower the score. The relative component uses a
 * deliberately soft 90..20 range, so the cleanest option is not automatically
 * 100 and the dirtiest option is not automatically pinned to a floor.
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
  return clampScore(absoluteImpactScore({
    key: "standalone",
    co2eKg: (Math.max(0, gPerKm) * Math.max(0, distanceKm)) / 1000,
    gPerKm,
    distanceKm,
  }));
}
