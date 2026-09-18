import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { StoreShell } from "@/components/store-shell";
import { NotFoundError, fetchProduct, formatPrice } from "@/lib/api";
import { LayoutContent, Tag } from "@/ui";

type Params = Promise<{ slug: string }>;

const load = async (slug: string) => {
  try {
    return await fetchProduct(slug);
  } catch (error) {
    // A draft or archived product 404s from the API exactly like a missing one, so
    // the storefront never reveals that an unpublished product exists.
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await load((await params).slug);
  return { title: `${product.name} · catalyst-commerce`, description: product.description };
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export default async function ProductPage({ params }: { params: Params }) {
  const product = await load((await params).slug);

  return (
    <StoreShell>
      <LayoutContent>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-text-muted">
            <Link href="/" className="hover:text-text">
              All products
            </Link>
            {product.categories[0] ? (
              <>
                <span className="mx-2">/</span>
                <Link href={`/?category=${product.categories[0].slug}`} className="hover:text-text">
                  {product.categories[0].name}
                </Link>
              </>
            ) : null}
          </nav>

          {/* The two-column detail every retailer uses: media left, buy box right.
              Stacks on narrow screens, where the image comes first. */}
          <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="rounded-lg border border-border bg-surface p-6">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="aspect-square w-full rounded-md object-cover" />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-hover text-6xl font-semibold text-text-muted"
                >
                  {initials(product.name)}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-semibold">{product.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.categories.map((category) => (
                  <Link key={category.slug} href={`/?category=${category.slug}`}>
                    <Tag size="sm" color="blue">
                      {category.name}
                    </Tag>
                  </Link>
                ))}
              </div>

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

              <div className="mt-8 border-t border-border pt-6">
                <h2 className="text-sm font-semibold">About this item</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{product.description}</p>
              </div>
            </div>
          </div>
        </div>
      </LayoutContent>
    </StoreShell>
  );
}
