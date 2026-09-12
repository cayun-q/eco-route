/** Carbon intensity by transport mode (g CO₂ / km). */
const MODE_CO2_G_PER_KM = {
  "driving-car": 171,
  "driving-ev": 45,
  "cycling-regular": 0,
  "foot-walking": 0,
};

const MAX_CO2_G_PER_KM = MODE_CO2_G_PER_KM["driving-car"];

/**
 * Calculate an Eco-Score from 0–100 based on transport-mode carbon intensity.
 * Higher score = lower emissions. Petrol car → 0, bike/walk → 100.
 *
 * @param {string | { co2GPerKm?: number, value?: string }} mode
 * @returns {number}
 */
export function calculateEcoScore(mode) {
  let intensity = MAX_CO2_G_PER_KM;

  if (typeof mode === "string") {
    intensity = MODE_CO2_G_PER_KM[mode] ?? MAX_CO2_G_PER_KM;
  } else if (mode && typeof mode.co2GPerKm === "number") {
    intensity = mode.co2GPerKm;
  } else if (mode && typeof mode.value === "string") {
    intensity = MODE_CO2_G_PER_KM[mode.value] ?? MAX_CO2_G_PER_KM;
  }

  intensity = Math.max(0, intensity);
  const score = 100 * (1 - intensity / MAX_CO2_G_PER_KM);
  return Math.round(Math.min(100, Math.max(0, score)));
}

export { MODE_CO2_G_PER_KM };
