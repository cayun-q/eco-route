import pg from "pg";

const url = process.env.DATABASE_URL ?? "postgres://carbonroute:carbonroute@127.0.0.1:5432/carbonroute";

export const pool = new pg.Pool({
  connectionString: url,
  max: 8,
});

export async function query<T extends pg.QueryResultRow>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
