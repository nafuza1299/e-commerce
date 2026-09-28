"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductDto } from "@repo/shared/schemas";
import { ProductTile } from "@/components/product-tile";
import { fetchCatalog } from "@/lib/api";
import { Button } from "@/ui";

// One full row at the widest breakpoint (xl:grid-cols-4).
const PRIORITY_TILES = 4;

export function InfiniteGrid({
  initialItems,
  initialCursor,
  query,
}: {
  initialItems: ProductDto[];
  initialCursor: string | null;
  /** The catalog query for every page, minus the cursor. */
  query: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || status !== "idle") return;

    // Re-created after every page, so a sentinel that is still on screen (a short page
    // on a tall viewport) fires again immediately instead of waiting for a scroll.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setStatus("loading");
        const search = new URLSearchParams(query);
        search.set("cursor", cursor);
        fetchCatalog(search).then(
          (page) => {
            setItems((prev) => [...prev, ...page.items]);
            setCursor(page.nextCursor);
            setStatus("idle");
          },
          () => setStatus("error"),
        );
      },
      // Start fetching well before the sentinel is visible, so fast scrolling rarely
      // reaches the end of what has loaded.
      { rootMargin: "0px 0px 800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, query, status]);

  return (
    <>
      <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((product, index) => (
          <li key={product.id}>
            <ProductTile product={product} priority={index < PRIORITY_TILES} />
          </li>
        ))}
      </ul>

      {cursor ? (
        <div ref={sentinel} className="mt-8 flex min-h-11 items-center justify-center">
          <p role="status" className="text-sm text-text-muted">
            {status === "loading" ? "Loading more products…" : null}
            {status === "error" ? "Couldn’t load more products." : null}
          </p>
          {status === "error" ? (
            <Button size="sm" variant="secondary" className="ml-3" onClick={() => setStatus("idle")}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
