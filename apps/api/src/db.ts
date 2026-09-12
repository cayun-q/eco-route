import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://carbonroute:carbonroute@127.0.0.1:5432/carbonroute";

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, "../db");

export async function migrateAndSeed(): Promise<void> {
  const initSql = fs.readFileSync(path.join(dbDir, "init.sql"), "utf8");
  const seedSql = fs.readFileSync(path.join(dbDir, "seed.sql"), "utf8");
  await pool.query(initSql);
  await pool.query(seedSql);
}

export type FactorRow = {
  mode: "car" | "ev" | "plane";
  g_per_km: string;
  source: string;
  notes: string | null;
  updated_at: Date;
};

export async function loadFactors(): Promise<FactorRow[]> {
  const { rows } = await pool.query<FactorRow>(
    "SELECT mode, g_per_km, source, notes, updated_at FROM emission_factors WHERE mode IN ('car', 'ev', 'plane') ORDER BY mode",
  );
  return rows;
}

export async function loadFactor(mode: string): Promise<FactorRow | null> {
  const { rows } = await pool.query<FactorRow>(
    "SELECT mode, g_per_km, source, notes, updated_at FROM emission_factors WHERE mode = $1 AND mode IN ('car', 'ev', 'plane')",
    [mode],
  );
  return rows[0] ?? null;
}
