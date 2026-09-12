# ASCII ordered origin/destination search

Branch: `cursor/ascii-ordered-search` (from `14fe2ae` / PR #1)

## Why

`lookupGazetteer` uses substring / includes matching and can pick the wrong place when words are out of order. This adds a **new** ordered ASCII search for the Origin and Destination fields without changing the old fuzzy gazetteer helper (still available for offline estimate fallback).

## What changed

### New: `packages/shared/src/orderedSearch.ts`
- `isAscii` / `toAsciiInput` — restrict input to ASCII letters, digits, space, comma, period, hyphen, apostrophe
- `orderedPlaceSearch(query, places, limit=8)` — case-insensitive ordered-token match over `GAZETTEER`
  - Query tokens must be an ordered subsequence of label tokens
  - Last query token may be a **prefix** of the matching label token (typeahead)
  - Latin accents folded on **labels only** so ASCII `"Sao Paulo"` matches `"São Paulo"`
  - Prefer prefix-of-label ranking
- Does **not** call Nominatim; does **not** patch `lookupGazetteer`

### New: `packages/shared/src/orderedSearch.test.ts`
Covers San Francisco / New York order, case, ASCII stripping, prefix typeahead, accent folding, ranking.

### New: `apps/mobile/src/components/PlaceSearch.tsx`
Labeled Origin/Destination field with ASCII-filtered input and suggestion list under the field. Tap fills the label. Does not use `PlaceField` or multimodal typeahead.

### Updated: `apps/mobile/src/screens/LogTripScreen.tsx`
Replaced the two `Field` inputs with `PlaceSearch`. Map-after-both-ends behavior unchanged.

### Updated: `packages/shared/src/index.ts`
Re-exports `orderedSearch`.

## Tests

```bash
npm run test --workspace=@carbonroute/shared
```

All shared tests passed (including new orderedSearch cases).

## Follow-up: contiguous words

- Query tokens must be a **contiguous** run in the label. `117 Kings` matches `117 Kings Road` and does **not** match `117 filler Kings`.
- Tokenize keeps digits so street numbers stay in the query.
