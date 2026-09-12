/**
 * Standard carbon intensity baselines by transport mode.
 * Values are grams of CO₂-equivalent per passenger-kilometre (g CO₂e / km).
 *
 * Sources (order-of-magnitude / commonly cited planning factors):
 * - Petrol car ~171 g/km (UK DEFRA / EEA-style average passenger car)
 * - Battery EV ~45 g/km (grid-average lifecycle / operational estimate)
 * - Local bus / metro-style transit ~89 g/km (DEFRA average local bus)
 * - Bicycle / walking ~0 g/km (direct tailpipe; excludes food/lifecycle)
 */

/**
 * @typedef {"driving-car" | "driving-ev" | "transit-bus" | "cycling-regular" | "foot-walking"} TransportModeId
 */

/**
 * @typedef {object} CarbonBaseline
 * @property {TransportModeId} id
 * @property {string} label
 * @property {number} gramsCo2ePerKm
 * @property {string} [orsProfile] OpenRouteService profile (if routable)
 * @property {string} [notes]
 */

/** @type {Readonly<Record<TransportModeId, CarbonBaseline>>} */
export const CARBON_BASELINES = Object.freeze({
  "driving-car": Object.freeze({
    id: "driving-car",
    label: "Driving (Car)",
    gramsCo2ePerKm: 171,
    orsProfile: "driving-car",
    notes: "Average petrol passenger car",
  }),
  "driving-ev": Object.freeze({
    id: "driving-ev",
    label: "Electric Vehicle (EV)",
    gramsCo2ePerKm: 45,
    orsProfile: "driving-car",
    notes: "Battery EV on a typical grid mix (same road route as car)",
  }),
  "transit-bus": Object.freeze({
    id: "transit-bus",
    label: "Transit (Bus)",
    gramsCo2ePerKm: 89,
    // Public ORS has no transit profile — duration/distance estimated from car.
    orsProfile: null,
    notes: "Average local bus per passenger-km",
  }),
  "cycling-regular": Object.freeze({
    id: "cycling-regular",
    label: "Bicycle",
    gramsCo2ePerKm: 0,
    orsProfile: "cycling-regular",
    notes: "No direct exhaust emissions",
  }),
  "foot-walking": Object.freeze({
    id: "foot-walking",
    label: "Walking",
    gramsCo2ePerKm: 0,
    orsProfile: "foot-walking",
    notes: "No direct exhaust emissions",
  }),
});

export const MAX_GRAMS_CO2E_PER_KM =
  CARBON_BASELINES["driving-car"].gramsCo2ePerKm;

/** @type {Readonly<Record<string, number>>} */
export const GRAMS_CO2E_PER_KM = Object.freeze(
  Object.fromEntries(
    Object.values(CARBON_BASELINES).map((b) => [b.id, b.gramsCo2ePerKm]),
  ),
);

/** @param {string} modeId */
export function getCarbonBaseline(modeId) {
  return CARBON_BASELINES[/** @type {TransportModeId} */ (modeId)];
}

/** @param {string} modeId */
export function getGramsCo2ePerKm(modeId) {
  return GRAMS_CO2E_PER_KM[modeId] ?? MAX_GRAMS_CO2E_PER_KM;
}

/** @deprecated Prefer GRAMS_CO2E_PER_KM */
export const MODE_CO2_G_PER_KM = GRAMS_CO2E_PER_KM;
