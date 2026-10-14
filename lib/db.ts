import dns from "node:dns";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

types.setTypeParser(1082, (value: string) => value);

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number
) => void;

const ipv4Lookup = (
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCallback
) => {
  dns.lookup(hostname, { ...options, family: 4 }, callback);
};

const globalForPg = globalThis as unknown as {
  pool?: Pool;
};

export const pool =
  globalForPg.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    lookup: ipv4Lookup,
  } as any);

if (process.env.NODE_ENV !== "production") {
  globalForPg.pool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
) {
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await fn(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
