import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config();
import { migrateAndSeed, pool } from "./db";

await migrateAndSeed();
const { rows } = await pool.query("SELECT mode, g_per_km, source FROM emission_factors ORDER BY mode");
console.log("Seeded emission factors:");
for (const row of rows) {
  console.log(`  ${row.mode}: ${row.g_per_km} g/km (${row.source})`);
}
await pool.end();
