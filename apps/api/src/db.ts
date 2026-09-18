import * as schema from "@repo/shared/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";

/*
  The driver is the one piece that cannot live in @repo/shared — the table
  definitions there are plain objects, but a connection is server-only.

  postgres-js over TCP rather than @neondatabase/serverless: this process is a
  long-lived Fastify server on Railway, so it wants a real pooled connection.
  The serverless driver exists for edge runtimes that cannot hold one open.
*/
const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });
export { schema };
