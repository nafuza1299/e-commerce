import { describe, expect, it } from "vitest";
import { adminProductInput, catalogQuery, checkoutInput } from "./index";

describe("catalogQuery", () => {
  // Fastify hands back a bare string for one occurrence of a key and an array for
  // several. Without normalising, ?category=shoes silently filters by the letters
  // of the word rather than by the one category.
  it("normalises a single category, many categories, and none into an array", () => {
    expect(catalogQuery.parse({ category: "shoes" }).category).toEqual(["shoes"]);
    expect(catalogQuery.parse({ category: ["shoes", "hats"] }).category).toEqual(["shoes", "hats"]);
    expect(catalogQuery.parse({}).category).toEqual([]);
  });

  it("coerces numeric query strings, since everything arrives as text", () => {
    const q = catalogQuery.parse({ minCents: "500", limit: "12" });
    expect(q.minCents).toBe(500);
    expect(q.limit).toBe(12);
  });

  it("rejects an inverted price range instead of returning an empty page", () => {
    expect(catalogQuery.safeParse({ minCents: "900", maxCents: "100" }).success).toBe(false);
    expect(catalogQuery.safeParse({ minCents: "100", maxCents: "900" }).success).toBe(true);
  });

  it("caps limit so a caller cannot ask for the whole table", () => {
    expect(catalogQuery.safeParse({ limit: "5000" }).success).toBe(false);
    expect(catalogQuery.parse({}).limit).toBe(24);
  });
});

describe("checkoutInput", () => {
  const valid = {
    email: "buyer@example.com",
    shippingName: "A Buyer",
    shippingLine1: "1 Test Street",
    shippingCity: "Testville",
    shippingPostalCode: "12345",
    shippingCountry: "id",
    items: [{ productId: "3f7c1b52-5f8a-4a2e-9b3e-2f9d1c8a7b60", quantity: 2 }],
  };

  it("accepts a well-formed order and upper-cases the country", () => {
    expect(checkoutInput.parse(valid).shippingCountry).toBe("ID");
  });

  // The security property, asserted rather than assumed: a price sent by the client
  // must not survive parsing, so it can never reach the code that totals the order.
  it("drops any client-supplied price", () => {
    const parsed = checkoutInput.parse({
      ...valid,
      items: [{ ...valid.items[0], unitPriceCents: 1, priceCents: 1 }],
    });
    expect(parsed.items[0]).toEqual({ productId: valid.items[0]!.productId, quantity: 2 });
  });

  it("rejects an empty cart and a zero quantity", () => {
    expect(checkoutInput.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(
      checkoutInput.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: 0 }] }).success,
    ).toBe(false);
  });
});

describe("adminProductInput", () => {
  const valid = { slug: "running-shoes", name: "Running Shoes", priceCents: 9900 };

  it("accepts a minimal product, leaving defaulted columns optional", () => {
    expect(adminProductInput.parse(valid).slug).toBe("running-shoes");
  });

  it("rejects slugs that would not survive a URL", () => {
    for (const slug of ["Running Shoes", "running_shoes", "-leading", "trailing-", "a--b"]) {
      expect(adminProductInput.safeParse({ ...valid, slug }).success).toBe(false);
    }
  });

  it("rejects free and negative-priced products", () => {
    expect(adminProductInput.safeParse({ ...valid, priceCents: 0 }).success).toBe(false);
    expect(adminProductInput.safeParse({ ...valid, priceCents: -1 }).success).toBe(false);
    expect(adminProductInput.safeParse({ ...valid, priceCents: 10.5 }).success).toBe(false);
  });

  // id and createdAt are database-generated. If a schema change ever lets them
  // through, an admin could pin a product's identity from the outside.
  it("does not accept database-generated columns", () => {
    const parsed = adminProductInput.parse({
      ...valid,
      id: "3f7c1b52-5f8a-4a2e-9b3e-2f9d1c8a7b60",
      createdAt: new Date(),
    }) as Record<string, unknown>;
    expect(parsed.id).toBeUndefined();
    expect(parsed.createdAt).toBeUndefined();
  });
});
