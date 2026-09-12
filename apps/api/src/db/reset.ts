import { pool } from "./client.js";
import { seed } from "./seed.js";

async function reset() {
  await pool.query("DROP TABLE IF EXISTS trips CASCADE");
  await pool.query("DROP TABLE IF EXISTS routes CASCADE");
  await pool.query("DROP TABLE IF EXISTS emission_factors CASCADE");
  await pool.query("DROP TABLE IF EXISTS schema_migrations CASCADE");
  const count = await seed();
  console.log(`Database reset. Seeded ${count} emission-factor rows.`);
}

reset()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
