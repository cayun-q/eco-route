import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { durationMinutesFor, haversineMiles } from "./geo";

describe("haversineMiles", () => {
  it("returns ~0 for the same point", () => {
    const p = { lat: 51.5074, lng: -0.1278 };
    assert.ok(haversineMiles(p, p) < 0.001);
  });

  it("is close to the known London–Paris great-circle distance", () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };
    const miles = haversineMiles(london, paris);
    assert.ok(miles > 200 && miles < 220);
  });
});

describe("durationMinutesFor", () => {
  it("converts distance and speed plus taxi time", () => {
    assert.equal(durationMinutesFor(500, 500, 40), 100);
  });
});
