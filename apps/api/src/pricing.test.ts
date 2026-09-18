import { describe, expect, it } from "vitest";
import { priceOrder, type SellableProduct } from "./pricing";

const A = "3f7c1b52-5f8a-4a2e-9b3e-2f9d1c8a7b60";
const B = "8b2d9e14-1c3a-4f7e-a5d6-0e1f2a3b4c5d";

const catalog: SellableProduct[] = [
  { id: A, name: "Keycap Set", priceCents: 4500, stock: 4 },
  { id: B, name: "Desk Mat", priceCents: 3900, stock: 10 },
];

describe("priceOrder", () => {
  it("prices from the catalog rows, never from the request", () => {
    // The request carries a price field it should not. Nothing reads it.
    const items = [{ productId: A, quantity: 2, unitPriceCents: 1 } as never];
    const result = priceOrder(items, catalog);
    expect(result).toEqual({
      ok: true,
      lines: [{ productId: A, name: "Keycap Set", quantity: 2, unitPriceCents: 4500 }],
      totalCents: 9000,
    });
  });

  it("totals in exact integer cents across lines", () => {
    const result = priceOrder(
      [
        { productId: A, quantity: 1 },
        { productId: B, quantity: 3 },
      ],
      catalog,
    );
    expect(result.ok && result.totalCents).toBe(4500 + 3 * 3900);
  });

  // The stock check has to see the merged total. Two lines of 3 against a stock of 4
  // each pass individually and oversell by 2.
  it("merges duplicate product lines before checking stock", () => {
    const result = priceOrder(
      [
        { productId: A, quantity: 3 },
        { productId: A, quantity: 3 },
      ],
      catalog,
    );
    expect(result).toEqual({ ok: false, error: "insufficient_stock", productId: A, available: 4 });
  });

  it("merges duplicates into one line when stock allows", () => {
    const result = priceOrder(
      [
        { productId: B, quantity: 2 },
        { productId: B, quantity: 3 },
      ],
      catalog,
    );
    expect(result.ok && result.lines).toEqual([
      { productId: B, name: "Desk Mat", quantity: 5, unitPriceCents: 3900 },
    ]);
  });

  it("rejects a product the catalog did not return", () => {
    const ghost = "00000000-0000-4000-8000-000000000000";
    expect(priceOrder([{ productId: ghost, quantity: 1 }], catalog)).toEqual({
      ok: false,
      error: "unknown_product",
      productId: ghost,
    });
  });

  it("allows buying exactly the remaining stock", () => {
    expect(priceOrder([{ productId: A, quantity: 4 }], catalog).ok).toBe(true);
    expect(priceOrder([{ productId: A, quantity: 5 }], catalog).ok).toBe(false);
  });
});
