import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/*
  No database is involved in any of this. postgres-js connects lazily, so the app
  can be built and its routes exercised as long as every assertion here stops before
  a query runs — which is exactly the set of things worth asserting: that bad input
  is rejected at the edge, and that the OpenAPI document really is generated from
  the same schemas.
*/
process.env.DATABASE_URL ??= "postgres://unused:unused@127.0.0.1:5432/unused";

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import("./app");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("request validation", () => {
  it("rejects a malformed cursor before touching the database", async () => {
    const res = await app.inject({ url: "/products?cursor=not-a-real-cursor" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "bad_cursor" });
  });

  it("rejects an inverted price range", async () => {
    const res = await app.inject({ url: "/products?minCents=900&maxCents=100" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("validation_error");
  });

  it("rejects a limit above the cap", async () => {
    expect((await app.inject({ url: "/products?limit=5000" })).statusCode).toBe(400);
  });

  it("rejects an unknown sort", async () => {
    expect((await app.inject({ url: "/products?sort=cheapest" })).statusCode).toBe(400);
  });

  it("rejects a price cursor whose sort value is not a number", async () => {
    // Well-formed cursor, wrong contents for this sort — the failure has to be a
    // 400 and not a 500 from Postgres refusing the ::int cast.
    const { encodeCursor } = await import("./cursor");
    const cursor = encodeCursor("not-a-number", "3f7c1b52-5f8a-4a2e-9b3e-2f9d1c8a7b60");
    const res = await app.inject({ url: `/products?sort=price-asc&cursor=${cursor}` });
    expect(res.statusCode).toBe(400);
  });
});

describe("openapi document", () => {
  it("is generated from the shared Zod schemas", () => {
    const paths = app.swagger().paths ?? {};

    expect(paths["/products"]).toBeDefined();
    expect(paths["/products/{slug}"]).toBeDefined();

    // A parameter entry is either an object or a $ref, so narrow before reading
    // a name off it rather than asserting the shape.
    const params = (paths["/products"]?.get?.parameters ?? []).flatMap((p) =>
      "name" in p ? [p.name] : [],
    );
    // These names exist in exactly one place — packages/shared. If the schema is
    // ever hand-copied instead of shared, this is what notices.
    expect(params).toEqual(
      expect.arrayContaining(["q", "category", "minCents", "maxCents", "sort", "cursor", "limit"]),
    );
  });

  it("documents the error shape, not just the happy path", () => {
    const paths = app.swagger().paths ?? {};
    expect(paths["/products/{slug}"]?.get?.responses?.["404"]).toBeDefined();
  });
});

describe("health", () => {
  it("answers without a database", async () => {
    const res = await app.inject({ url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
