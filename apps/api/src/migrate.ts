import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, query } from "./db.js";

const here = dirname(fileURLToPath(import.meta.url));

const FACTORS = [
  {
    mode: "car",
    band: "average",
    activity: "Average car, unknown fuel",
    kg: 0.16475,
  },
  {
    mode: "train",
    band: "national_rail",
    activity: "National rail",
    kg: 0.03546,
  },
  {
    mode: "plane",
    band: "domestic",
    activity: "Domestic flight, average, with radiative forcing",
    kg: 0.27258,
  },
  {
    mode: "plane",
    band: "short_haul",
    activity: "Short-haul flight, average, with radiative forcing",
    kg: 0.18592,
  },
  {
    mode: "plane",
    band: "long_haul",
    activity: "Long-haul flight, economy, with radiative forcing",
    kg: 0.14787,
  },
] as const;

export async function migrate(): Promise<void> {
  const sql = readFileSync(join(here, "schema.sql"), "utf8");
  await query(sql);
  await query(`ALTER TABLE trip_legs ADD COLUMN IF NOT EXISTS origin_iata TEXT`);
  await query(`ALTER TABLE trip_legs ADD COLUMN IF NOT EXISTS destination_iata TEXT`);

  for (const row of FACTORS) {
    await query(
      `INSERT INTO emission_factors (mode, band, activity, kg_co2e_per_km, source, year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (mode, band) DO UPDATE SET
         activity = EXCLUDED.activity,
         kg_co2e_per_km = EXCLUDED.kg_co2e_per_km,
         source = EXCLUDED.source,
         year = EXCLUDED.year`,
      [
        row.mode,
        row.band,
        row.activity,
        row.kg,
        "DESNZ/DEFRA GHG Conversion Factors 2024 (UK, passenger travel)",
        2024,
      ],
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(async () => {
      const { rows } = await query("SELECT mode, band, kg_co2e_per_km FROM emission_factors ORDER BY id");
      console.log("Migrated. Factors:", rows);
      await pool.end();
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
