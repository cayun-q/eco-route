import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAutoLegs, getPlace } from "@carbonroute/shared";

test("car and train stay a single hop", () => {
  const sf = getPlace("sf")!;
  const brooklyn = getPlace("brooklyn")!;
  const car = buildAutoLegs(sf, brooklyn, "car");
  assert.equal(car.length, 1);
  assert.equal(car[0].mode, "car");
  const train = buildAutoLegs(getPlace("stpancras")!, getPlace("gdn")!, "train");
  assert.equal(train.length, 1);
  assert.equal(train[0].mode, "train");
});

test("plane between cities becomes car → plane → car", () => {
  const legs = buildAutoLegs(getPlace("sf")!, getPlace("brooklyn")!, "plane");
  assert.deepEqual(
    legs.map((l) => l.mode),
    ["car", "plane", "car"],
  );
  assert.equal(legs[0].origin.label, "San Francisco");
  assert.ok(legs[1].origin.iata);
  assert.ok(legs[1].destination.iata);
  assert.equal(legs[2].destination.label, "Brooklyn");
});

test("airport to airport is one plane hop", () => {
  const legs = buildAutoLegs(getPlace("sfo")!, getPlace("jfk")!, "plane");
  assert.equal(legs.length, 1);
  assert.equal(legs[0].mode, "plane");
});
