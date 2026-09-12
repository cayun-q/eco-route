import { GAZETTEER } from "./gazetteer";
import type { Place } from "./types";

/** ASCII letters, digits, space, comma, period, hyphen, apostrophe. */
const ASCII_INPUT_RE = /^[\x20-\x7E]*$/;
const ASCII_KEEP_RE = /[A-Za-z0-9 .,.'\-]/g;

export function isAscii(s: string): boolean {
  return ASCII_INPUT_RE.test(s) && [...s].every((ch) => /[A-Za-z0-9 .,.'\-]/.test(ch));
}

/** Keep only allowed ASCII printable characters for place search input. */
export function toAsciiInput(s: string): string {
  const kept = s.match(ASCII_KEEP_RE);
  return kept ? kept.join("") : "";
}

/** Fold Latin accents for matching only (labels), e.g. São → Sao. */
export function foldLatinAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Lowercase and split on non-letters into word tokens. */
export function tokenize(s: string, foldAccents = false): string[] {
  const base = foldAccents ? foldLatinAccents(s) : s;
  return base
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

export type OrderedSearchHit = Place & {
  /** Lower is better. Prefix-of-label matches rank first. */
  rank: number;
};

function matchesOrdered(
  queryTokens: string[],
  labelTokens: string[],
): { ok: boolean; startIndex: number; lastExact: boolean } {
  if (queryTokens.length === 0) {
    return { ok: false, startIndex: -1, lastExact: false };
  }

  let qi = 0;
  let startIndex = -1;
  let lastExact = false;

  for (let li = 0; li < labelTokens.length && qi < queryTokens.length; li++) {
    const q = queryTokens[qi]!;
    const label = labelTokens[li]!;
    const isLastQuery = qi === queryTokens.length - 1;

    if (isLastQuery) {
      if (label === q || label.startsWith(q)) {
        if (startIndex < 0) startIndex = li;
        lastExact = label === q;
        qi += 1;
        break;
      }
    } else if (label === q) {
      if (startIndex < 0) startIndex = li;
      qi += 1;
    }
  }

  return {
    ok: qi === queryTokens.length,
    startIndex,
    lastExact,
  };
}

/**
 * Ordered ASCII place search over a gazetteer list.
 * Query tokens must appear in order in the label; the last query token may be a
 * prefix of the matching label token (typeahead). Prefer matches that start at
 * the beginning of the label.
 */
export function orderedPlaceSearch(
  query: string,
  places: Place[] = GAZETTEER,
  limit = 8,
): OrderedSearchHit[] {
  const ascii = toAsciiInput(query).trim();
  if (!ascii) return [];

  const queryTokens = tokenize(ascii, false);
  if (queryTokens.length === 0) return [];

  const hits: OrderedSearchHit[] = [];

  for (const place of places) {
    const labelTokens = tokenize(place.label, true);
    const match = matchesOrdered(queryTokens, labelTokens);
    if (!match.ok) continue;

    // Prefer prefix-of-label (starts at token 0), then exact last token, then earlier start.
    const prefixBonus = match.startIndex === 0 ? 0 : 1000;
    const exactBonus = match.lastExact ? 0 : 100;
    const rank = prefixBonus + exactBonus + match.startIndex + place.label.length / 1000;

    hits.push({ ...place, rank });
  }

  hits.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
  return hits.slice(0, limit);
}
