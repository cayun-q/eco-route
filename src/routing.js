import { CARBON_BASELINES, getGramsCo2ePerKm } from "./carbonBaselines.js";

const ORS_DIRECTIONS_BASE =
  "https://api.openrouteservice.org/v2/directions";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function getOrsApiKey() {
  return import.meta.env.VITE_ORS_API_KEY || "";
}

/**
 * @typedef {{ lat: number, lon: number, label?: string }} LatLon
 * @typedef {{
 *   modeId: string,
 *   label: string,
 *   distanceKm: number,
 *   durationSec: number,
 *   co2Grams: number,
 *   gramsCo2ePerKm: number,
 *   source: "ors" | "estimated",
 *   coordinates?: number[][],
 * }} RouteOption
 */

/** @param {string} query @returns {Promise<LatLon>} */
export async function geocode(query) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Location lookup failed (${response.status}).`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error(`Could not find “${query}”. Try a clearer place name.`);
  }

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    label: results[0].display_name,
  };
}

async function fetchOrsRoute(start, end, orsProfile) {
  const apiKey = getOrsApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing VITE_ORS_API_KEY. Copy .env.example to .env and add your OpenRouteService key.",
    );
  }

  const response = await fetch(`${ORS_DIRECTIONS_BASE}/${orsProfile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept:
        "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
    },
    body: JSON.stringify({
      coordinates: [
        [start.lon, start.lat],
        [end.lon, end.lat],
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      payload?.error?.message ||
      payload?.message ||
      `OpenRouteService failed (${response.status})`;
    throw new Error(detail);
  }

  const feature = payload?.features?.[0];
  if (!feature) {
    throw new Error(`No ${orsProfile} route returned.`);
  }

  const summary = feature.properties?.summary ?? {};
  return {
    distanceKm: (summary.distance ?? 0) / 1000,
    durationSec: summary.duration ?? 0,
    coordinates: feature.geometry?.coordinates ?? [],
  };
}

function toRouteOption(modeId, stats) {
  const baseline = CARBON_BASELINES[modeId];
  const gramsCo2ePerKm = getGramsCo2ePerKm(modeId);
  return {
    modeId,
    label: baseline?.label ?? modeId,
    distanceKm: stats.distanceKm,
    durationSec: stats.durationSec,
    gramsCo2ePerKm,
    co2Grams: gramsCo2ePerKm * stats.distanceKm,
    source: stats.source ?? "ors",
    coordinates: stats.coordinates,
  };
}

/**
 * Fetch primary mode route plus parallel alternatives.
 * EV reuses driving-car geometry; transit is estimated from driving.
 *
 * @param {LatLon} start
 * @param {LatLon} end
 * @param {string} primaryModeId
 */
export async function fetchMultiModalRoutes(start, end, primaryModeId) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Map<string, { distanceKm: number, durationSec: number, coordinates?: number[][] }>} */
  const profileCache = new Map();

  const profilesNeeded = new Set();
  for (const baseline of Object.values(CARBON_BASELINES)) {
    if (baseline.orsProfile) profilesNeeded.add(baseline.orsProfile);
  }

  await Promise.all(
    [...profilesNeeded].map(async (profile) => {
      try {
        profileCache.set(profile, await fetchOrsRoute(start, end, profile));
      } catch (error) {
        errors.push(
          `${profile}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),
  );

  const driving = profileCache.get("driving-car");
  /** @type {RouteOption[]} */
  const all = [];

  for (const baseline of Object.values(CARBON_BASELINES)) {
    if (baseline.orsProfile && profileCache.has(baseline.orsProfile)) {
      all.push(
        toRouteOption(baseline.id, {
          ...profileCache.get(baseline.orsProfile),
          source: "ors",
        }),
      );
      continue;
    }

    if (baseline.id === "transit-bus" && driving) {
      all.push(
        toRouteOption("transit-bus", {
          distanceKm: driving.distanceKm * 1.05,
          durationSec: driving.durationSec * 1.55,
          coordinates: driving.coordinates,
          source: "estimated",
        }),
      );
    }
  }

  const primary =
    all.find((o) => o.modeId === primaryModeId) ??
    all.find((o) => o.modeId === "driving-car");

  if (!primary) {
    throw new Error(
      errors[0] ||
        "Could not fetch any routes. Check VITE_ORS_API_KEY and try again.",
    );
  }

  return {
    primary,
    alternatives: all.filter((o) => o.modeId !== primary.modeId),
    errors,
    all,
  };
}
