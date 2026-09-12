import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { durationMinutesFor, greatCirclePolyline, haversineMiles, simplifyPolyline } from "./geo";

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

describe("greatCirclePolyline", () => {
  it("starts at the origin and ends at the destination", () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };
    const line = greatCirclePolyline(london, paris, 16);
    assert.equal(line[0].lat, london.lat);
    assert.equal(line[0].lng, london.lng);
    assert.ok(Math.abs(line[line.length - 1].lat - paris.lat) < 0.001);
    assert.ok(Math.abs(line[line.length - 1].lng - paris.lng) < 0.001);
    assert.ok(line.length >= 3);
  });
});

describe("simplifyPolyline", () => {
  it("keeps short lines intact and always preserves endpoints", () => {
    const short = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
    ];
    assert.deepEqual(simplifyPolyline(short, 10), short);

    const long = Array.from({ length: 500 }, (_, i) => ({ lat: i / 10, lng: i / 10 }));
    const slim = simplifyPolyline(long, 20);
    assert.equal(slim.length, 20);
    assert.deepEqual(slim[0], long[0]);
    assert.deepEqual(slim[slim.length - 1], long[long.length - 1]);
  });
});
