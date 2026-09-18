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
