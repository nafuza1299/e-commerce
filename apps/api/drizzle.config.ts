import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  // The schema lives in the shared package, because the web app needs the Zod
  // schemas derived from it. drizzle-kit reads it from there directly.
  schema: "../../packages/shared/src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
