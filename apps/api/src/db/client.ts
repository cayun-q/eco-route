import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../.env") });
config({ path: resolve(here, "../../../../.env") });

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://carbonroute:carbonroute@localhost:5432/carbonroute";

export const pool = new pg.Pool({
  connectionString,
  max: 10,
});

export async function withClient<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
