import Link from "next/link";
import type { ProductDto } from "@repo/shared/schemas";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/api";
import { Card, CardBody, Tag } from "@/ui";

/*
  imageUrl is resolved once by the seed — a Pexels photo when PEXELS_API_KEY is set,
  otherwise a local SVG in apps/web/public/products — so rendering never calls an image
  API and cannot be rate-limited. ProductImage draws the initials if either is missing.
*/

export function ProductTile({
  product,
  priority = false,
}: {
  product: ProductDto;
  priority?: boolean;
}) {
  const low = product.stock > 0 && product.stock <= 8;

  return (
    <Card as="article" interactive className="h-full">
      <CardBody>
        <Link href={`/p/${product.slug}`} className="block">
          <ProductImage src={product.imageUrl} name={product.name} priority={priority} />
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
