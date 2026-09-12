import assert from "node:assert/strict";
import { test } from "node:test";
import { GAZETTEER } from "./gazetteer";
import {
  isAscii,
  orderedPlaceSearch,
  toAsciiInput,
  tokenize,
  foldLatinAccents,
} from "./orderedSearch";

test('"san francisco" hits San Francisco', () => {
  const hits = orderedPlaceSearch("san francisco", GAZETTEER);
  assert.ok(hits.some((h) => h.label.startsWith("San Francisco")));
});

test('"francisco san" does NOT hit San Francisco', () => {
  const hits = orderedPlaceSearch("francisco san", GAZETTEER);
  assert.ok(!hits.some((h) => h.label.startsWith("San Francisco")));
});

test('"SAN FR" (case) hits San Francisco', () => {
  const hits = orderedPlaceSearch("SAN FR", GAZETTEER);
  assert.ok(hits.some((h) => h.label.startsWith("San Francisco")));
});

test("non-ascii input is stripped/rejected", () => {
  assert.equal(isAscii("san francisco"), true);
  assert.equal(isAscii("São Paulo"), false);
  assert.equal(toAsciiInput("São Paulo"), "So Paulo");
  assert.equal(toAsciiInput("san francisco"), "san francisco");
  assert.equal(toAsciiInput("hello😀world"), "helloworld");
  // Stripped query should still allow ASCII-only matching path
  const stripped = toAsciiInput("café");
  assert.equal(stripped, "caf");
  assert.ok(isAscii(stripped));
});

test('"york new" does NOT hit New York', () => {
  const hits = orderedPlaceSearch("york new", GAZETTEER);
  assert.ok(!hits.some((h) => h.label.startsWith("New York")));
});

test('"new yo" DOES hit New York', () => {
  const hits = orderedPlaceSearch("new yo", GAZETTEER);
  assert.ok(hits.some((h) => h.label.startsWith("New York")));
});

test("ASCII query Sao Paulo matches accented gazetteer label", () => {
  assert.equal(foldLatinAccents("São Paulo, Brazil"), "Sao Paulo, Brazil");
  const hits = orderedPlaceSearch("Sao Paulo", GAZETTEER);
  assert.ok(hits.some((h) => h.label.includes("Paulo")));
});

test("tokenize labels fold accents; query does not need accents", () => {
  assert.deepEqual(tokenize("São Paulo, Brazil", true), ["sao", "paulo", "brazil"]);
  assert.deepEqual(tokenize("Sao Paulo", false), ["sao", "paulo"]);
});

test("prefix-of-label ranks ahead of later subsequence", () => {
  const hits = orderedPlaceSearch("ca", GAZETTEER, 20);
  assert.ok(hits.length > 0);
  // Cape Town / similar starting with "ca" should beat "... CA" state suffix matches
  const first = hits[0]!;
  assert.ok(
    tokenize(first.label, true)[0]!.startsWith("ca"),
    `expected prefix-of-label first, got ${first.label}`,
  );
});
