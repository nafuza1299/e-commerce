import { existsSync } from "node:fs";
import { z } from "zod";

// Node's own env-file loader (>=20.6), so this needs no dotenv dependency. It
// throws on a missing file, hence the guard: in production the platform injects
// the variables and there is no .env on disk at all.
if (existsSync(".env")) process.loadEnvFile(".env");

/*
  Validated once, at boot. A missing DATABASE_URL should stop the process with a
  sentence naming the variable — not surface later as a connection error on the
  first request, which is where that mistake usually gets found.
*/
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "required: the Postgres connection string"),
  PORT: z.coerce.number().int().default(3001),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`Invalid environment. Copy .env.example to .env and fill in:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
