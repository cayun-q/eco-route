import {
  greatCirclePolyline,
  haversineKm,
  type Place,
  type RouteLeg,
} from "@carbonroute/shared";
import { airportPlace, findFlightPlan } from "./airportGraph";
import { routeBetween } from "./routing";

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function concatPolylines(legs: RouteLeg[]): [number, number][] {
  const out: [number, number][] = [];
  for (const leg of legs) {
    for (let i = 0; i < leg.polyline.length; i += 1) {
      if (out.length && i === 0) continue;
      out.push(leg.polyline[i]);
    }
  }
  return out;
}

export async function buildPlaneJourney(origin: Place, destination: Place): Promise<{
  legs: RouteLeg[];
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
}> {
  const airports = await findFlightPlan(origin, destination);
  const departure = airportPlace(airports[0]);
  const arrival = airportPlace(airports[airports.length - 1]);

  const [firstDrive, lastDrive] = await Promise.all([
    routeBetween(origin, departure, "car"),
    routeBetween(arrival, destination, "car"),
  ]);

  const legs: RouteLeg[] = [
    {
      mode: "car",
      origin,
      destination: departure,
      distanceKm: firstDrive.distanceKm,
      durationMin: firstDrive.durationMin,
      polyline: firstDrive.polyline,
      provider: firstDrive.provider,
      summary: `Drive to ${airports[0].iata}`,
    },
  ];

  for (let i = 0; i < airports.length - 1; i += 1) {
    const fromAirport = airports[i];
    const toAirport = airports[i + 1];
    const from = airportPlace(fromAirport);
    const to = airportPlace(toAirport);
    const distanceKm = round3(haversineKm(from, to));
    const airborneMin = Math.max(25, Math.round((distanceKm / 780) * 60));
    const connectionOverhead = i === 0 ? 55 : 70;
    legs.push({
      mode: "plane",
      origin: from,
      destination: to,
      distanceKm,
      durationMin: airborneMin + connectionOverhead,
      polyline: greatCirclePolyline(from, to, 64),
      provider: "openflights",
      summary: `Fly ${fromAirport.iata} → ${toAirport.iata}`,
    });
  }

  legs.push({
    mode: "car",
    origin: arrival,
    destination,
    distanceKm: lastDrive.distanceKm,
    durationMin: lastDrive.durationMin,
    polyline: lastDrive.polyline,
    provider: lastDrive.provider,
    summary: `Drive from ${airports[airports.length - 1].iata}`,
  });

  return {
    legs,
    distanceKm: round3(legs.reduce((sum, leg) => sum + leg.distanceKm, 0)),
    durationMin: legs.reduce((sum, leg) => sum + leg.durationMin, 0),
    polyline: concatPolylines(legs),
  };
}
