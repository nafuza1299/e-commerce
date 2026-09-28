"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/**
 * The product photo, or the product's initials on a token background when there is
 * none or it fails to load — a broken-image icon reads as a broken store.
 */
export function ProductImage({
  src,
  name,
  large = false,
  priority = false,
}: {
  src: string | null;
  name: string;
  large?: boolean;
  /** The first row of catalog tiles: above the fold, so it competes for the LCP. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // An image that errored before hydration fired onError before React attached it,
  // so check the element once on mount as well.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={`flex aspect-square w-full items-center justify-center rounded-md bg-surface-hover font-semibold text-text-muted ${large ? "text-6xl" : "text-2xl"}`}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md">
      <NextImage
        ref={ref}
        src={src}
        alt=""
        fill
        // The product-detail hero and the first catalog row are the LCP candidates;
        // every other tile stays at the default lazy loading.
        preload={large}
        loading={priority ? "eager" : undefined}
        fetchPriority={priority ? "high" : undefined}
        sizes={large ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </div>
  );
}
