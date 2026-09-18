/*
  Turns what the client asked for into what will actually be charged.

  Kept pure — no database, no Fastify — because this is the money path and it has
  to be testable in isolation. The route fetches the products and hands them in.

  The rule that matters: every price on the way out came from the `products` rows
  passed in, never from the request. The request contributes ids and quantities and
  nothing else; `checkoutInput` already strips anything more, and this function has
  no field to read a client price from even if one arrived.
*/

export type RequestedItem = { productId: string; quantity: number };
export type SellableProduct = { id: string; name: string; priceCents: number; stock: number };
export type OrderLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type PricedOrder =
  | { ok: true; lines: OrderLine[]; totalCents: number }
  | { ok: false; error: "unknown_product"; productId: string }
  | { ok: false; error: "insufficient_stock"; productId: string; available: number };

/**
 * A cart can legitimately list the same product twice — added from two different
 * pages, or a stale tab. Merged first so the stock check sees the true total; per-
 * line checks would happily approve two lines of 3 against a stock of 4.
 */
const mergeQuantities = (items: RequestedItem[]): Map<string, number> => {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }
  return merged;
};

export const priceOrder = (items: RequestedItem[], products: SellableProduct[]): PricedOrder => {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: OrderLine[] = [];

  for (const [productId, quantity] of mergeQuantities(items)) {
    const product = byId.get(productId);
    // A product that is draft, archived or deleted is simply absent from the rows the
    // route fetched (it only selects active ones), so all three surface the same way.
    if (!product) return { ok: false, error: "unknown_product", productId };
    if (product.stock < quantity) {
      return { ok: false, error: "insufficient_stock", productId, available: product.stock };
    }
    lines.push({
      productId,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
    });
  }

  // Integer cents throughout, so this sum is exact.
  const totalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  return { ok: true, lines, totalCents };
};
