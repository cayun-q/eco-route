/** Carbon intensity by transport mode (g CO₂ / km). */
export const MODE_CO2_G_PER_KM = {
  "driving-car": 171,
  "driving-ev": 45,
  "cycling-regular": 0,
  "foot-walking": 0,
};

const MAX_CO2_G_PER_KM = MODE_CO2_G_PER_KM["driving-car"];
/** Worst practical score — petrol car no longer drops to 0. */
export const ECO_SCORE_FLOOR = 30;
/** Score span above the floor (floor + span = 100). */
const ECO_SCORE_SPAN = 100 - ECO_SCORE_FLOOR;
/** Distance (km) at which mode intensity is fully applied. */
const REFERENCE_DISTANCE_KM = 20;

function resolveIntensity(mode) {
  if (typeof mode === "string") {
    return MODE_CO2_G_PER_KM[mode] ?? MAX_CO2_G_PER_KM;
  }
  if (mode && typeof mode.co2GPerKm === "number") {
    return mode.co2GPerKm;
  }
  if (mode && typeof mode.value === "string") {
    return MODE_CO2_G_PER_KM[mode.value] ?? MAX_CO2_G_PER_KM;
  }
  return MAX_CO2_G_PER_KM;
}

/**
 * Eco-Score from transport mode and trip distance.
 * Uses location-derived distance (km) plus mode carbon intensity.
 * Floor is ~30 so a petrol car never scores 0.
 *
 * score = 30 + 70 × (1 − modeFactor × (0.35 + 0.65 × distanceFactor))
 * where modeFactor = g_CO₂/km ÷ 171 and distanceFactor = min(1, km ÷ 20)
 *
 * @param {string | { co2GPerKm?: number, value?: string }} mode
 * @param {number} [distanceKm=0]
 * @returns {number} integer 30–100 (0 km zero-emission still 100)
 */
export function calculateEcoScore(mode, distanceKm = 0) {
  const intensity = Math.max(0, resolveIntensity(mode));
  const modeFactor = intensity / MAX_CO2_G_PER_KM;
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const distanceFactor = Math.min(1, safeDistance / REFERENCE_DISTANCE_KM);

  // Mode always counts some; longer trips apply intensity more fully.
  const severity = modeFactor * (0.35 + 0.65 * distanceFactor);
  const raw = ECO_SCORE_FLOOR + ECO_SCORE_SPAN * (1 - severity);
  return Math.round(Math.min(100, Math.max(ECO_SCORE_FLOOR, raw)));
}

/** Estimated trip CO₂ in grams. */
export function estimateTripCo2Grams(mode, distanceKm = 0) {
  const intensity = Math.max(0, resolveIntensity(mode));
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  return intensity * safeDistance;
}
