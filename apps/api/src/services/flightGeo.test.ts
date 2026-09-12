import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AIRPORTS } from "../data/airports";
import { flightArc, haversineKm, nearestAirport, slerp } from "./flightGeo";

describe("geo", () => {
  it("measures New York to Boston as a regional drive, not a transcon", () => {
    const km = haversineKm([-74.006, 40.7128], [-71.0589, 42.3601]);
    assert.ok(km > 250 && km < 400, `expected ~300 km, got ${km}`);
  });

  it("snaps Midtown Manhattan to a New York airport", () => {
    const airport = nearestAirport([-73.9857, 40.7484], AIRPORTS);
    assert.ok(["JFK", "LGA", "EWR"].includes(airport.iata), airport.iata);
  });

  it("snaps downtown Boston to BOS", () => {
    assert.equal(nearestAirport([-71.0589, 42.3601], AIRPORTS).iata, "BOS");
  });

  it("builds a curved flight corridor, not a two-point chord", () => {
    const from: [number, number] = [-73.7781, 40.6413];
    const to: [number, number] = [-118.4085, 33.9416];
    const arc = flightArc(from, to);
    assert.ok(arc.length > 20);
    const midArc = arc[Math.floor(arc.length / 2)];
    const midChord = slerp(from, to, 0.5);
    const offsetKm = haversineKm(midArc, midChord);
    assert.ok(offsetKm > 80, `expected a visible bulge, got ${offsetKm} km`);
  });
});
