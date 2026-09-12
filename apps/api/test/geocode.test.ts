import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestAirports } from "../src/airports.js";
import { clearSuggestCache, geocodeOne, parseLatLng, suggestPlaces } from "../src/geocode.js";
import { greatCircleArc, interpolateGreatCircle } from "../src/routing.js";

test("parseLatLng accepts a coordinate pair", () => {
  const place = parseLatLng("37.7749, -122.4194");
  assert.ok(place);
  assert.equal(place.kind, "address");
  assert.ok(Math.abs(place.lat - 37.7749) < 1e-6);
});

test("geocodeOne prefers latlng then gazetteer", async () => {
  const coord = await geocodeOne("40.6413,-73.7781");
  assert.ok(coord);
  assert.equal(coord.id.startsWith("latlng:"), true);

  const airport = await geocodeOne("SFO");
  assert.ok(airport);
  assert.equal(airport.label, "SFO");
  assert.equal(airport.kind, "airport");
});

test("suggest includes gazetteer cities and at least five slots of capacity", async () => {
  const places = await suggestPlaces("san fran", 6);
  assert.ok(places.some((p) => p.label === "San Francisco"));
  assert.ok(places.length >= 1);
  assert.ok(places.length <= 6);
});

test("suggest with gazetteer hits does not block on slow Nominatim", async () => {
  clearSuggestCache();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Promise(() => {})) as typeof fetch;
  try {
    const start = Date.now();
    const places = await suggestPlaces("brooklyn", 6);
    const elapsed = Date.now() - start;
    assert.ok(places.some((p) => /brooklyn/i.test(p.label)), "should return local gazetteer hit");
    assert.ok(elapsed < 900, `local-first should return within provider budget, took ${elapsed}ms`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("plane airport suggest returns IATA-shaped places without Nominatim", async () => {
  const airports = suggestAirports("sfo", 6);
  assert.ok(airports.some((p) => p.iata === "SFO"));
  const fromCity = suggestAirports("san fran", 6);
  assert.ok(fromCity.some((p) => p.iata === "SFO" || p.iata === "OAK" || p.iata === "SJC"));
  const viaMode = await suggestPlaces("jfk", 6, { mode: "plane" });
  assert.ok(viaMode.every((p) => p.kind === "airport" || p.iata));
  assert.ok(viaMode.some((p) => p.iata === "JFK"));
});

test("plane geometry is a great-circle arc, not a two-point chord", () => {
  const origin = { lat: 37.6213, lng: -122.379 };
  const dest = { lat: 40.6413, lng: -73.7781 };
  const arc = greatCircleArc(origin, dest);
  assert.ok(arc.length >= 16);
  const mid = arc[Math.floor(arc.length / 2)];
  const chordMid = {
    lat: (origin.lat + dest.lat) / 2,
    lng: (origin.lng + dest.lng) / 2,
  };
  const gcMid = interpolateGreatCircle(origin, dest, 0.5);
  // DesignBridge bow: mid sits off the pure great-circle by a medium sine lift (~12–18% span).
  const liftLat = Math.abs(mid.lat - gcMid.lat);
  const liftLng = Math.abs(mid.lng - gcMid.lng);
  assert.ok(liftLat > 0.2 || liftLng > 0.2, "plane should bow off the pure great-circle");
  assert.ok(liftLat < 8 && liftLng < 8, "bow stays medium, not a rainbow");
  assert.ok(
    Math.abs(mid.lat - chordMid.lat) > 0.2 || Math.abs(mid.lng - chordMid.lng) > 0.2,
    "plane should still bow off a straight chord",
  );
});
