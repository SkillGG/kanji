import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import { relations } from "drizzle/relations";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = client;

export const db = drizzle({ client, relations });
export type DrizzleDB = typeof db;
export type DrizzleTX = Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0];
export type DrizzleClient = DrizzleDB | DrizzleTX;
