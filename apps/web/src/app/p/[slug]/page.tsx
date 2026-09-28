import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductBuyBox } from "@/components/product-buy-box";
import { ProductImage } from "@/components/product-image";
import { StoreShell } from "@/components/store-shell";
import { NotFoundError, fetchProduct } from "@/lib/api";
import { catalogHref } from "@/lib/search-params";
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
                <Link
                  href={catalogHref(new URLSearchParams({ category: product.categories[0].slug }))}
                  className="hover:text-text"
                >
                  {product.categories[0].name}
                </Link>
              </>
            ) : null}
          </nav>

          {/* The two-column detail every retailer uses: media left, buy box right.
              Stacks on narrow screens, where the image comes first. */}
          <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="rounded-lg border border-border bg-surface p-6">
              <ProductImage src={product.imageUrl} name={product.name} large />
              {product.imageUrl && product.imageCreditName && product.imageCreditUrl ? (
                <p className="mt-3 text-xs text-text-muted">
                  Photo by{" "}
                  <a href={product.imageCreditUrl} className="hover:text-text hover:underline">
                    {product.imageCreditName}
                  </a>{" "}
                  on Pexels
                </p>
              ) : null}
            </div>

            <div>
              <h1 className="text-2xl font-semibold">{product.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={catalogHref(new URLSearchParams({ category: category.slug }))}
                  >
                    <Tag size="sm" color="blue">
                      {category.name}
                    </Tag>
                  </Link>
                ))}
              </div>

              {/* Keyed so moving between products resets it instead of showing the
                  previous product's price until the refetch lands. */}
              <ProductBuyBox key={product.id} initial={product} />

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
