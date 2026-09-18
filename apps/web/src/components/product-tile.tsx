import Link from "next/link";
import type { ProductDto } from "@repo/shared/schemas";
import { formatPrice } from "@/lib/api";
import { Card, CardBody, Tag } from "@/ui";

/*
  Seeded products carry no imageUrl, and a catalog grid without images reads as broken
  rather than as unfinished. The placeholder is drawn from the product's own initials on
  a token background: deterministic, themed in both modes, and no network request — an
  external placeholder service would be a third-party dependency on every tile and a
  blank grid the moment it rate-limits.
*/
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const Thumb = ({ product }: { product: ProductDto }) =>
  product.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl}
      alt=""
      className="aspect-square w-full rounded-md object-cover"
    />
  ) : (
    <div
      aria-hidden="true"
      className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-hover text-2xl font-semibold text-text-muted"
    >
      {initials(product.name)}
    </div>
  );

export function ProductTile({ product }: { product: ProductDto }) {
  const low = product.stock > 0 && product.stock <= 8;

  return (
    <Card as="article" interactive className="h-full">
      <CardBody>
        <Link href={`/p/${product.slug}`} className="block">
          <Thumb product={product} />
          {/* line-clamp keeps every tile the same height so the grid stays on a
              baseline no matter how long a product name runs. */}
          <h3 className="mt-3 line-clamp-2 text-sm font-medium hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <p className="mt-2 text-lg font-semibold">{formatPrice(product.priceCents)}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {product.categories.slice(0, 2).map((category) => (
            <Tag key={category.slug} size="sm" color="gray">
              {category.name}
            </Tag>
          ))}
          {low ? (
            <Tag size="sm" color="amber">
              Only {product.stock} left
            </Tag>
          ) : null}
          {product.stock === 0 ? (
            <Tag size="sm" color="red">
              Out of stock
            </Tag>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
