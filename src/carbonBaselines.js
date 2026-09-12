/**
 * Standard carbon intensity baselines by transport mode.
 * Values are grams of CO₂-equivalent per passenger-kilometre (g CO₂e / km).
 *
 * Sources (order-of-magnitude / commonly cited planning factors):
 * - Petrol car ~171 g/km (UK DEFRA / EEA-style average passenger car)
 * - Battery EV ~45 g/km (grid-average lifecycle / operational estimate)
 * - Bicycle / walking ~0 g/km (direct tailpipe; excludes food/lifecycle)
 */

/** @typedef {"driving-car" | "driving-ev" | "cycling-regular" | "foot-walking"} TransportModeId */

/**
 * @typedef {object} CarbonBaseline
 * @property {string} id Stable mode id (matches UI option values)
 * @property {string} label Human-readable mode name
 * @property {number} gramsCo2ePerKm Emissions intensity in g CO₂e / km
 * @property {string} [notes] Optional context for the factor
 */

/** @type {Readonly<Record<TransportModeId, CarbonBaseline>>} */
export const CARBON_BASELINES = Object.freeze({
  "driving-car": Object.freeze({
    id: "driving-car",
    label: "Driving (Car)",
    gramsCo2ePerKm: 171,
    notes: "Average petrol passenger car",
  }),
  "driving-ev": Object.freeze({
    id: "driving-ev",
    label: "Electric Vehicle (EV)",
    gramsCo2ePerKm: 45,
    notes: "Battery EV on a typical grid mix",
  }),
  "cycling-regular": Object.freeze({
    id: "cycling-regular",
    label: "Bicycle",
    gramsCo2ePerKm: 0,
    notes: "No direct exhaust emissions",
  }),
  "foot-walking": Object.freeze({
    id: "foot-walking",
    label: "Walking",
    gramsCo2ePerKm: 0,
    notes: "No direct exhaust emissions",
  }),
});

/** Highest baseline intensity in the table (petrol car). */
export const MAX_GRAMS_CO2E_PER_KM =
  CARBON_BASELINES["driving-car"].gramsCo2ePerKm;

/**
 * Flat lookup map: mode id → g CO₂e / km.
 * @type {Readonly<Record<string, number>>}
 */
export const GRAMS_CO2E_PER_KM = Object.freeze(
  Object.fromEntries(
    Object.values(CARBON_BASELINES).map((baseline) => [
      baseline.id,
      baseline.gramsCo2ePerKm,
    ]),
  ),
);

/**
 * @param {string} modeId
 * @returns {CarbonBaseline | undefined}
 */
export function getCarbonBaseline(modeId) {
  return CARBON_BASELINES[/** @type {TransportModeId} */ (modeId)];
}

/**
 * @param {string} modeId
 * @returns {number} g CO₂e / km (falls back to petrol car if unknown)
 */
export function getGramsCo2ePerKm(modeId) {
  return GRAMS_CO2E_PER_KM[modeId] ?? MAX_GRAMS_CO2E_PER_KM;
}

/** @deprecated Prefer GRAMS_CO2E_PER_KM — kept for existing imports. */
export const MODE_CO2_G_PER_KM = GRAMS_CO2E_PER_KM;
