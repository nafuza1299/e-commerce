"use client";

import { useEffect, useState } from "react";
import type { ProductDto } from "@repo/shared/schemas";
import { AddToCart } from "@/components/add-to-cart";
import { NotFoundError, fetchProduct, formatPrice } from "@/lib/api";
import { Tag } from "@/ui";

/*
  The server render is a snapshot, and a client-side navigation can replay it from
  Next's router cache. Price and stock are what a shopper acts on, so they are
  re-read from the API every time this mounts — i.e. every time a product is opened.
*/
export function ProductBuyBox({ initial }: { initial: ProductDto }) {
  const [product, setProduct] = useState(initial);

  useEffect(() => {
    let live = true;
    fetchProduct(initial.slug).then(
      (fresh) => {
        if (live) setProduct(fresh);
      },
      (error) => {
        // Archived since the snapshot was taken: make it un-addable. Any other
        // failure (API unreachable) keeps the snapshot rather than blanking the page.
        if (live && error instanceof NotFoundError) setProduct((p) => ({ ...p, stock: 0 }));
      },
    );
    return () => {
      live = false;
    };
  }, [initial.slug]);

  return (
    <>
      <p className="mt-6 text-3xl font-semibold">{formatPrice(product.priceCents)}</p>

      <div className="mt-3">
        {product.stock === 0 ? (
          <Tag color="red">Out of stock</Tag>
        ) : product.stock <= 8 ? (
          <Tag color="amber">Only {product.stock} left</Tag>
        ) : (
          <Tag color="green">In stock</Tag>
        )}
      </div>

      <div className="mt-6">
        <AddToCart product={product} />
      </div>
    </>
  );
}
