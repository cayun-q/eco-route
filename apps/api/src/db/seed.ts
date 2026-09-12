import { fileURLToPath } from "node:url";
import { pool } from "./client.js";
import { migrate } from "./migrate.js";

/**
 * Starter factors converted from published DEFRA / EPA / ICAO-style
 * passenger intensities. Values are illustrative defaults meant to be
 * replaced by a later data load — the calculator never hardcodes them.
 *
 * Per-mile figures are g CO2e / passenger-mile.
 * Per-hour figures (trains) cover hotel power / idling on top of distance.
 */
const FACTORS = [
  {
    mode: "car",
    subtype: "petrol",
    gramsCo2ePerMile: 264.8,
    gramsCo2ePerHour: null,
    source: "DEFRA GHG Conversion Factors 2024 — average petrol car",
    year: 2024,
  },
  {
    mode: "car",
    subtype: "ev",
    gramsCo2ePerMile: 71.8,
    gramsCo2ePerHour: null,
    source: "DEFRA GHG Conversion Factors 2024 — battery EV, UK grid",
    year: 2024,
  },
  {
    mode: "plane",
    subtype: "short_haul",
    gramsCo2ePerMile: 299.2,
    gramsCo2ePerHour: null,
    source: "DEFRA 2024 short-haul international, economy, with RF 1.9",
    year: 2024,
  },
  {
    mode: "plane",
    subtype: "long_haul",
    gramsCo2ePerMile: 238.0,
    gramsCo2ePerHour: null,
    source: "DEFRA 2024 long-haul, economy, with RF 1.9",
    year: 2024,
  },
  {
    mode: "train",
    subtype: "diesel",
    gramsCo2ePerMile: 142.0,
    gramsCo2ePerHour: 180.0,
    source: "DEFRA-style national rail diesel + hotel-load estimate",
    year: 2024,
  },
  {
    mode: "train",
    subtype: "electric",
    gramsCo2ePerMile: 45.1,
    gramsCo2ePerHour: 80.0,
    source: "DEFRA-style national rail electric + hotel-load estimate",
    year: 2024,
  },
] as const;

export async function seed(): Promise<number> {
  await migrate();
  let upserts = 0;
  for (const factor of FACTORS) {
    const result = await pool.query(
      `
        INSERT INTO emission_factors (
          mode, subtype, grams_co2e_per_mile, grams_co2e_per_hour, source, year
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (mode, subtype, source, year)
        DO UPDATE SET
          grams_co2e_per_mile = EXCLUDED.grams_co2e_per_mile,
          grams_co2e_per_hour = EXCLUDED.grams_co2e_per_hour,
          is_active = true
      `,
      [
        factor.mode,
        factor.subtype,
        factor.gramsCo2ePerMile,
        factor.gramsCo2ePerHour,
        factor.source,
        factor.year,
      ],
    );
    upserts += result.rowCount ?? 0;
  }
  return upserts;
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) {
  seed()
    .then((count) => {
      console.log(`Seeded ${count} emission-factor rows`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
