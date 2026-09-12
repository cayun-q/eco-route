import { airportsNear } from "./places";
import type { Place } from "./types";
import type { TravelMode } from "./theme";

export type AutoLeg = {
  mode: TravelMode;
  origin: Place;
  destination: Place;
};

export function isAirport(place: Place): boolean {
  return place.kind === "airport" || Boolean(place.iata);
}

export function nearestAirport(place: Place): Place | null {
  if (isAirport(place)) return place;
  return airportsNear(place)[0] ?? null;
}

/**
 * One origin + destination + mode → legs for estimate/save.
 * Plane (or airport-to-airport) becomes car→plane→car when a city sits
 * off the airport. Car and train stay a single hop.
 */
export function buildAutoLegs(origin: Place, destination: Place, mode: TravelMode): AutoLeg[] {
  if (mode === "car" || mode === "train") {
    return [{ mode, origin, destination }];
  }

  const fromApt = nearestAirport(origin);
  const toApt = nearestAirport(destination);
  if (!fromApt || !toApt) {
    return [{ mode: "plane", origin, destination }];
  }
  if (fromApt.id === toApt.id || (fromApt.lat === toApt.lat && fromApt.lng === toApt.lng)) {
    return [{ mode: "plane", origin, destination }];
  }

  const legs: AutoLeg[] = [];
  if (!isAirport(origin)) {
    legs.push({ mode: "car", origin, destination: fromApt });
  }
  legs.push({ mode: "plane", origin: fromApt, destination: toApt });
  if (!isAirport(destination)) {
    legs.push({ mode: "car", origin: toApt, destination });
  }
  return legs;
}
