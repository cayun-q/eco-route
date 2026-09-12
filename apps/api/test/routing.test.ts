import assert from "node:assert/strict";
import { test } from "node:test";
import { flightBand, haversineKm, mockRoute } from "../src/routing.js";

test("haversine SFO–JFK is about 4,150 km", () => {
  const km = haversineKm({ lat: 37.6213, lng: -122.379 }, { lat: 40.6413, lng: -73.7781 });
  assert.ok(km > 4000 && km < 4300);
});

test("flight bands follow DESNZ haul distances", () => {
  assert.equal(flightBand(400), "domestic");
  assert.equal(flightBand(1200), "short_haul");
  assert.equal(flightBand(8000), "long_haul");
});

test("mock routes always start and end on the requested coordinates", () => {
  const origin = { lat: 37.7749, lng: -122.4194 };
  const destination = { lat: 37.6213, lng: -122.379 };
  for (const mode of ["car", "plane", "train"] as const) {
    const line = mockRoute(mode, origin, destination);
    assert.deepEqual(line[0], origin);
    assert.deepEqual(line[line.length - 1], destination);
  }
});

test("plane arcs have more than a straight chord", () => {
  const origin = { lat: 37.6213, lng: -122.379 };
  const destination = { lat: 40.6413, lng: -73.7781 };
  const line = mockRoute("plane", origin, destination);
  assert.ok(line.length > 8);
  const mid = line[Math.floor(line.length / 2)];
  const chordLat = (origin.lat + destination.lat) / 2;
  assert.ok(Math.abs(mid.lat - chordLat) > 0.5, "great-circle should bow off the chord");
  assert.ok(Math.abs(mid.lat - chordLat) < 8, "bow ~12–18% span — medium, not a rainbow");
});

test("car and train stay on a flat ground chord", () => {
  const origin = { lat: 37.7749, lng: -122.4194 };
  const destination = { lat: 37.6213, lng: -122.379 };
  for (const mode of ["car", "train"] as const) {
    const line = mockRoute(mode, origin, destination);
    const mid = line[Math.floor(line.length / 2)];
    const chordLat = (origin.lat + destination.lat) / 2;
    const chordLng = (origin.lng + destination.lng) / 2;
    assert.ok(Math.abs(mid.lat - chordLat) < 0.02);
    assert.ok(Math.abs(mid.lng - chordLng) < 0.02);
  }
});
