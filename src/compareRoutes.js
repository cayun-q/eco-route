/** Practical distance caps for active / estimated modes. */
export const MODE_MAX_DISTANCE_KM = Object.freeze({
  "foot-walking": 5,
  "cycling-regular": 25,
  "transit-bus": 80,
  "driving-ev": 500,
  "driving-car": 500,
});

export const MAX_DURATION_MULTIPLIER = 2.75;
export const PARK_RIDE_MIN_KM = 25;

/**
 * @typedef {import("./routing.js").RouteOption} RouteOption
 * @typedef {{
 *   route: RouteOption,
 *   isPrimary: boolean,
 *   realistic: boolean,
 *   rejectReasons: string[],
 *   co2SavedGrams: number,
 *   co2SavedPercent: number,
 *   extraMinutes: number,
 *   timeSavedMinutes: number,
 * }} ComparedRoute
 */

/** @param {RouteOption} primary @param {RouteOption} candidate */
export function evaluateRealism(primary, candidate) {
  const rejectReasons = [];
  const maxKm = MODE_MAX_DISTANCE_KM[candidate.modeId];

  if (typeof maxKm === "number" && candidate.distanceKm > maxKm) {
    rejectReasons.push(
      `Over practical max for ${candidate.label} (${maxKm} km).`,
    );
  }

  if (
    (candidate.modeId === "foot-walking" ||
      candidate.modeId === "cycling-regular") &&
    candidate.durationSec > primary.durationSec * MAX_DURATION_MULTIPLIER
  ) {
    rejectReasons.push(
      `Takes over ${MAX_DURATION_MULTIPLIER}× as long as ${primary.label}.`,
    );
  }

  if (candidate.modeId === "foot-walking" && candidate.durationSec > 9000) {
    rejectReasons.push("Walk would take more than 2.5 hours.");
  }

  if (candidate.modeId === "cycling-regular" && candidate.durationSec > 10800) {
    rejectReasons.push("Bike ride would take more than 3 hours.");
  }

  return { realistic: rejectReasons.length === 0, rejectReasons };
}

/**
 * @param {RouteOption} primary
 * @param {RouteOption[]} alternatives
 * @returns {ComparedRoute[]}
 */
export function compareAlternatives(primary, alternatives) {
  const compared = [primary, ...alternatives].map((route) => {
    const isPrimary = route.modeId === primary.modeId;
    const { realistic, rejectReasons } = isPrimary
      ? { realistic: true, rejectReasons: [] }
      : evaluateRealism(primary, route);

    const co2SavedGrams = primary.co2Grams - route.co2Grams;
    const co2SavedPercent =
      primary.co2Grams > 0 ? (co2SavedGrams / primary.co2Grams) * 100 : 0;
    const extraMinutes = (route.durationSec - primary.durationSec) / 60;

    return {
      route,
      isPrimary,
      realistic,
      rejectReasons,
      co2SavedGrams,
      co2SavedPercent,
      extraMinutes,
      timeSavedMinutes: -extraMinutes,
    };
  });

  return compared.sort((a, b) => {
    if (a.realistic !== b.realistic) return a.realistic ? -1 : 1;
    if (b.co2SavedGrams !== a.co2SavedGrams) {
      return b.co2SavedGrams - a.co2SavedGrams;
    }
    return a.route.durationSec - b.route.durationSec;
  });
}

/**
 * Long car/EV trips → simple Drive → Transit suggestion.
 * @param {RouteOption} primary
 * @param {RouteOption | undefined} transit
 */
export function buildParkAndRideSuggestion(primary, transit) {
  if (primary.distanceKm < PARK_RIDE_MIN_KM) return null;
  if (primary.modeId !== "driving-car" && primary.modeId !== "driving-ev") {
    return null;
  }

  const driveShare = 0.35;
  const transitShare = 0.65;
  const driveKm = primary.distanceKm * driveShare;
  const transitKm =
    (transit?.distanceKm ?? primary.distanceKm * 1.05) * transitShare;
  const driveIntensity = primary.modeId === "driving-ev" ? 45 : 171;
  const transitCo2 = transitKm * 89;
  const driveCo2 = driveKm * driveIntensity;
  const totalCo2 = driveCo2 + transitCo2;
  const durationSec =
    primary.durationSec * driveShare +
    (transit?.durationSec ?? primary.durationSec * 1.55) * transitShare;

  return {
    modeId: "park-and-ride",
    label: "Park & Ride (Drive → Transit)",
    distanceKm: driveKm + transitKm,
    durationSec,
    co2Grams: totalCo2,
    gramsCo2ePerKm: totalCo2 / Math.max(driveKm + transitKm, 0.001),
    source: "estimated",
    detail: `Drive ~${driveKm.toFixed(1)} km to a hub, then transit ~${transitKm.toFixed(1)} km.`,
  };
}
