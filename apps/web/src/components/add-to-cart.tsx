"use client";

import { useState } from "react";
import type { ProductDto } from "@repo/shared/schemas";
import { useCart } from "@/store/cart";
import { Button } from "@/ui";

export function AddToCart({ product }: { product: ProductDto }) {
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.find((l) => l.productId === product.id)?.quantity ?? 0);
  const [justAdded, setJustAdded] = useState(false);

  if (product.stock === 0) {
    return (
      <Button disabled size="lg">
        Out of stock
      </Button>
    );
  }

  // The cart already holds every unit there is. Checkout re-checks stock on the
  // server regardless; this just stops the shopper building a cart that will fail.
  if (inCart >= product.stock) {
    return (
      <div className="flex flex-col gap-2">
        <Button disabled size="lg">
          All in your cart
        </Button>
        <p className="text-sm text-text-muted" aria-live="polite">
          {inCart} in your cart, no more in stock
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        onClick={() => {
          add({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
          });
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 1500);
        }}
      >
        {justAdded ? "Added" : "Add to cart"}
      </Button>
      {/* aria-live so a screen reader hears the confirmation without leaving the button. */}
      <p className="text-sm text-text-muted" aria-live="polite">
        {inCart > 0 ? `${inCart} in your cart` : " "}
      </p>
    </div>
  );
}
