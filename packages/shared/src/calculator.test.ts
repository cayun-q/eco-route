import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateEmissions, pickFactor, resolveSubtype } from "./calculator";
import type { EmissionFactor } from "./types";

const petrol: EmissionFactor = {
  id: 1,
  mode: "car",
  subtype: "petrol",
  gramsCo2ePerMile: 265,
  gramsCo2ePerHour: null,
  source: "test",
  year: 2024,
  isActive: true,
};

const dieselTrain: EmissionFactor = {
  id: 2,
  mode: "train",
  subtype: "diesel",
  gramsCo2ePerMile: 142,
  gramsCo2ePerHour: 180,
  source: "test",
  year: 2024,
  isActive: true,
};

describe("resolveSubtype", () => {
  it("keeps an explicit subtype", () => {
    assert.equal(resolveSubtype("plane", "long_haul", 200), "long_haul");
  });

  it("picks short-haul under 1500 miles", () => {
    assert.equal(resolveSubtype("plane", undefined, 800), "short_haul");
  });

  it("picks long-haul at 1500+ miles", () => {
    assert.equal(resolveSubtype("plane", undefined, 1500), "long_haul");
  });

  it("defaults car to petrol and train to electric", () => {
    assert.equal(resolveSubtype("car"), "petrol");
    assert.equal(resolveSubtype("train"), "electric");
  });
});

describe("calculateEmissions", () => {
  it("uses per-mile only when hourly is absent", () => {
    const result = calculateEmissions(
      { distanceMiles: 10, durationMinutes: 30 },
      petrol,
    );
    assert.equal(result.gramsCo2e, 2650);
    assert.equal(result.fromDistance, 2650);
    assert.equal(result.fromDuration, 0);
  });

  it("adds per-mile and per-hour components", () => {
    const result = calculateEmissions(
      { distanceMiles: 100, durationMinutes: 90 },
      dieselTrain,
    );
    assert.equal(result.fromDistance, 14200);
    assert.equal(result.fromDuration, 270);
    assert.equal(result.gramsCo2e, 14470);
  });

  it("rejects a factor with no intensity values", () => {
    assert.throws(() =>
      calculateEmissions(
        { distanceMiles: 1, durationMinutes: 1 },
        { ...petrol, gramsCo2ePerMile: null, gramsCo2ePerHour: null },
      ),
    );
  });
});

describe("pickFactor", () => {
  it("returns the active matching row", () => {
    assert.equal(pickFactor([petrol, dieselTrain], "car", "petrol").id, 1);
  });

  it("throws when the table has no match", () => {
    assert.throws(() => pickFactor([petrol], "train", "electric"));
  });
});
