/**
 * Faithful TypeScript port of apps/api/calc/distance_ecotourism.py
 * (ECOTOURISM TRIP CARBON CALCULATOR — MVP).
 *
 * Train factors are intentionally absent — keep DESNZ/Postgres for train.
 */

export const EARTH_RADIUS_MILES = 3958.8;
export const MILES_TO_KM = 1.609344;
export const GRAMS_PER_POUND = 453.59237;

/** MVP estimate only; replace with a routing API later. */
export const ROAD_FACTOR = 1.25;

/** EPA tailpipe factors. */
export const FUEL_CO2_G_PER_GALLON = {
  gasoline: 8887.0,
  diesel: 10180.0,
} as const;

export type FuelType = keyof typeof FUEL_CO2_G_PER_GALLON;

/** EPA eGRID 2023 U.S. total CO2 = 767.209 lb/MWh. */
export const US_GRID_CO2_LB_PER_KWH = 767.209 / 1000.0;

/** EPA Model Year 2025 median EV energy consumption. */
export const DEFAULT_EV_KWH_PER_100_MILES = 39.0;

/**
 * 2026 UK Government GHG Conversion Factors, direct CO2,
 * before the 8% great-circle-distance uplift.
 */
export const PLANE_CO2_G_PER_PKM = {
  domestic: {
    economy: 124.0,
    premium_economy: 124.0,
    business: 124.0,
    first: 124.0,
  },
  short_haul: {
    economy: 68.0,
    premium_economy: 68.0,
    business: 102.0,
    first: 102.0,
  },
  long_haul: {
    economy: 63.2,
    premium_economy: 101.1,
    business: 183.3,
    first: 252.8,
  },
} as const;

export type FlightType = keyof typeof PLANE_CO2_G_PER_PKM;
export type CabinClass = keyof (typeof PLANE_CO2_G_PER_PKM)["domestic"];

export const PLANE_DISTANCE_UPLIFT = 1.08;

export const DEFAULT_CAR_AVERAGE_SPEED_MPH = 55.0;
export const DEFAULT_PLANE_SPEED_MPH = 500.0;
export const DEFAULT_PLANE_EXTRA_TIME_HOURS = 0.5;

export type CarPresetKey =
  | "gas_economy"
  | "gas_average"
  | "gas_suv"
  | "diesel"
  | "hybrid"
  | "ev";

type CarPresetIce = {
  label: string;
  fuel: FuelType;
  mpg: number;
  electric?: false;
};

type CarPresetEv = {
  label: string;
  electric: true;
  kwh_per_100_miles: number;
};

export type CarPreset = CarPresetIce | CarPresetEv;

export const CAR_PRESETS: Record<CarPresetKey, CarPreset> = {
  gas_economy: { label: "Gasoline — efficient car", fuel: "gasoline", mpg: 35.0 },
  gas_average: { label: "Gasoline — average car", fuel: "gasoline", mpg: 30.0 },
  gas_suv: { label: "Gasoline — SUV", fuel: "gasoline", mpg: 20.0 },
  diesel: { label: "Diesel car", fuel: "diesel", mpg: 30.0 },
  hybrid: { label: "Hybrid", fuel: "gasoline", mpg: 50.0 },
  ev: {
    label: "Battery EV",
    electric: true,
    kwh_per_100_miles: DEFAULT_EV_KWH_PER_100_MILES,
  },
};

export type TripResult = {
  mode: "drive" | "fly";
  vehicle: string;
  distance_miles: number;
  travel_time_hours: number;
  total_co2_lb: number;
  co2_per_passenger_lb: number;
  co2_per_hour_lb: number;
  co2_per_mile_lb: number;
  passengers: number;
};

export function tripResultAsDict(r: TripResult): Record<string, number | string> {
  return {
    mode: r.mode,
    vehicle: r.vehicle,
    distance_miles: Math.round(r.distance_miles * 100) / 100,
    travel_time_hours: Math.round(r.travel_time_hours * 100) / 100,
    total_co2_lb: Math.round(r.total_co2_lb * 100) / 100,
    co2_per_passenger_lb: Math.round(r.co2_per_passenger_lb * 100) / 100,
    co2_per_hour_lb: Math.round(r.co2_per_hour_lb * 100) / 100,
    co2_per_mile_lb: Math.round(r.co2_per_mile_lb * 10000) / 10000,
    passengers: r.passengers,
  };
}

/** Preset city coordinates matching the Python demo. */
export const CITIES: Record<string, { lat: number; lon: number }> = {
  new_york: { lat: 40.7128, lon: -74.006 },
  los_angeles: { lat: 34.0522, lon: -118.2437 },
  chicago: { lat: 41.8781, lon: -87.6298 },
  san_francisco: { lat: 37.7749, lon: -122.4194 },
  miami: { lat: 25.7617, lon: -80.1918 },
  seattle: { lat: 47.6062, lon: -122.3321 },
  denver: { lat: 39.7392, lon: -104.9903 },
  boston: { lat: 42.3601, lon: -71.0589 },
  austin: { lat: 30.2672, lon: -97.7431 },
  pittsburgh: { lat: 40.4406, lon: -79.9959 },
};

export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

export function greatCircleMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1R = toRad(lat1);
  const lon1R = toRad(lon1);
  const lat2R = toRad(lat2);
  const lon2R = toRad(lon2);
  const dLat = lat2R - lat1R;
  const dLon = lon2R - lon1R;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1R) * Math.cos(lat2R) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

export function roadDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return greatCircleMiles(lat1, lon1, lat2, lon2) * ROAD_FACTOR;
}

export function distanceBetweenCities(
  cityKeyA: string,
  cityKeyB: string,
  mode: "drive" | "fly" = "drive",
): number {
  const a = CITIES[cityKeyA];
  const b = CITIES[cityKeyB];
  if (!a || !b) {
    throw new Error(`Unknown city key: ${a == null ? cityKeyA : cityKeyB}`);
  }
  if (mode === "fly") {
    return greatCircleMiles(a.lat, a.lon, b.lat, b.lon);
  }
  return roadDistanceMiles(a.lat, a.lon, b.lat, b.lon);
}

export function carCo2LbPerMile(mpg: number, fuel: FuelType | string = "gasoline"): number {
  if (mpg <= 0) throw new Error("MPG must be greater than zero");
  const fuelKey = fuel.toLowerCase() as FuelType;
  if (!(fuelKey in FUEL_CO2_G_PER_GALLON)) {
    throw new Error(`Unsupported fuel: ${fuel}`);
  }
  const gramsPerMile = FUEL_CO2_G_PER_GALLON[fuelKey] / mpg;
  return gramsPerMile / GRAMS_PER_POUND;
}

export function evCo2LbPerMile(
  kwhPer100Miles: number = DEFAULT_EV_KWH_PER_100_MILES,
  gridCo2LbPerKwh: number = US_GRID_CO2_LB_PER_KWH,
): number {
  if (kwhPer100Miles <= 0) {
    throw new Error("EV energy consumption must be greater than zero");
  }
  return (kwhPer100Miles / 100.0) * gridCo2LbPerKwh;
}

export function carTripEmissions(
  distanceMiles: number,
  vehicle: CarPresetKey | string = "gas_average",
  passengers = 1,
  travelTimeHours?: number | null,
): TripResult {
  if (passengers < 1) throw new Error("Passengers must be at least 1");
  if (!(vehicle in CAR_PRESETS)) {
    throw new Error(`Unknown vehicle preset: ${vehicle}`);
  }
  const spec = CAR_PRESETS[vehicle as CarPresetKey];

  let lbPerMile: number;
  if ("electric" in spec && spec.electric) {
    lbPerMile = evCo2LbPerMile(spec.kwh_per_100_miles);
  } else {
    const ice = spec as CarPresetIce;
    lbPerMile = carCo2LbPerMile(ice.mpg, ice.fuel);
  }

  const totalLb = distanceMiles * lbPerMile;
  let hours = travelTimeHours ?? distanceMiles / DEFAULT_CAR_AVERAGE_SPEED_MPH;
  if (hours <= 0) throw new Error("Travel time must be greater than zero");

  return {
    mode: "drive",
    vehicle: spec.label,
    distance_miles: distanceMiles,
    travel_time_hours: hours,
    total_co2_lb: totalLb,
    co2_per_passenger_lb: totalLb / passengers,
    co2_per_hour_lb: totalLb / hours,
    co2_per_mile_lb: lbPerMile,
    passengers,
  };
}

/**
 * Classify by distance in km (UK 2026 distance bands used as MVP thresholds):
 *   km < 1000 → domestic
 *   km < 3700 → short_haul
 *   else → long_haul
 */
export function classifyFlight(distanceMiles: number): FlightType {
  const km = distanceMiles * MILES_TO_KM;
  if (km < 1000) return "domestic";
  if (km < 3700) return "short_haul";
  return "long_haul";
}

export function planeCo2LbPerPassenger(
  distanceMiles: number,
  flightType?: FlightType | string | null,
  cabinClass: CabinClass | string = "economy",
  applyDistanceUplift = true,
): number {
  if (distanceMiles < 0) throw new Error("Distance cannot be negative");

  const type = (flightType ?? classifyFlight(distanceMiles)) as FlightType;
  const cabin = cabinClass.toLowerCase() as CabinClass;

  if (!(type in PLANE_CO2_G_PER_PKM)) {
    throw new Error(`Unknown flight type: ${flightType}`);
  }
  const byCabin = PLANE_CO2_G_PER_PKM[type];
  if (!(cabin in byCabin)) {
    throw new Error(`Unknown cabin class: ${cabinClass}`);
  }

  let factor = byCabin[cabin];
  if (applyDistanceUplift) factor *= PLANE_DISTANCE_UPLIFT;

  const km = distanceMiles * MILES_TO_KM;
  const grams = km * factor;
  return grams / GRAMS_PER_POUND;
}

export function planeTripEmissions(
  distanceMiles: number,
  passengers = 1,
  flightType?: FlightType | string | null,
  cabinClass: CabinClass | string = "economy",
  travelTimeHours?: number | null,
): TripResult {
  if (passengers < 1) throw new Error("Passengers must be at least 1");

  const type = (flightType ?? classifyFlight(distanceMiles)) as FlightType;
  const lbPerPassenger = planeCo2LbPerPassenger(
    distanceMiles,
    type,
    cabinClass,
  );
  const totalLb = lbPerPassenger * passengers;

  let hours =
    travelTimeHours ??
    distanceMiles / DEFAULT_PLANE_SPEED_MPH + DEFAULT_PLANE_EXTRA_TIME_HOURS;
  if (hours <= 0) throw new Error("Travel time must be greater than zero");

  // Match Python: flight_type.replace('_', ' ').title() — cabin_class.title()
  const flightLabel = type
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
  const cabinRaw = String(cabinClass);
  const cabinLabel = cabinRaw
    .split(" ")
    .map((w) =>
      w
        .split("_")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
        .join("_"),
    )
    .join(" ");
  const vehicle = `Plane — ${flightLabel} — ${cabinLabel}`;

  return {
    mode: "fly",
    vehicle,
    distance_miles: distanceMiles,
    travel_time_hours: hours,
    total_co2_lb: totalLb,
    co2_per_passenger_lb: lbPerPassenger,
    co2_per_hour_lb: totalLb / hours,
    co2_per_mile_lb: distanceMiles ? lbPerPassenger / distanceMiles : 0,
    passengers,
  };
}

export function compareTrip(
  cityKeyA: string,
  cityKeyB: string,
  passengers = 1,
  carVehicles?: CarPresetKey[],
  cabinClass: CabinClass | string = "economy",
): TripResult[] {
  const vehicles: CarPresetKey[] = carVehicles ?? [
    "gas_economy",
    "gas_average",
    "gas_suv",
    "diesel",
    "hybrid",
    "ev",
  ];

  const driveDistance = distanceBetweenCities(cityKeyA, cityKeyB, "drive");
  const flightDistance = distanceBetweenCities(cityKeyA, cityKeyB, "fly");

  const results: TripResult[] = vehicles.map((vehicle) =>
    carTripEmissions(driveDistance, vehicle, passengers),
  );

  results.push(
    planeTripEmissions(flightDistance, passengers, null, cabinClass),
  );

  return results.sort((a, b) => a.co2_per_passenger_lb - b.co2_per_passenger_lb);
}

/** Effective g CO₂ / km from car lb/mile (for API factor.gPerKm). */
export function carLbPerMileToGPerKm(lbPerMile: number): number {
  return (lbPerMile * GRAMS_PER_POUND) / MILES_TO_KM;
}

/** Effective g CO₂ / pkm from plane lb/passenger over display miles. */
export function planeLbPerPassengerToGPerKm(
  lbPerPassenger: number,
  distanceMiles: number,
): number {
  if (distanceMiles <= 0) return 0;
  const kg = lbToKg(lbPerPassenger);
  const km = distanceMiles * MILES_TO_KM;
  return (kg * 1000) / km;
}
