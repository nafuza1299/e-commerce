import Link from "next/link";
import { FilterRail, priceBandLabel } from "@/components/filter-rail";
import { ProductTile } from "@/components/product-tile";
import { SiteHeader } from "@/components/site-header";
import { SortSelect } from "@/components/sort-select";
import { ApiUnavailableError, fetchCatalog, fetchCategories } from "@/lib/api";
import { asList, toQuery, withCursor, type Params } from "@/lib/search-params";
import {
  Card,
  CardBody,
  CardHeader,
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
  LayoutSider,
} from "@/ui";

/*
  A server component. The catalog is public, read-only and benefits from arriving as
  HTML, and every filter is expressed in the URL — so the only client JavaScript on this
  page is the sort dropdown and the theme toggle.
*/

type SearchParams = Promise<Params>;

const one = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const num = (value: string | string[] | undefined): number | undefined => {
  const raw = one(value);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const activeCategories = asList(params.category);
  const query = one(params.q);
  const sort = one(params.sort) ?? "newest";
  const activeBand = priceBandLabel(num(params.minCents), num(params.maxCents));

  // Independent requests, so they overlap rather than queue.
  let page: Awaited<ReturnType<typeof fetchCatalog>> | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let unreachable = false;
  try {
    [page, categories] = await Promise.all([fetchCatalog(toQuery(params)), fetchCategories()]);
  } catch (error) {
    // Only "the API is not running" degrades softly — it is the normal state on a fresh
    // clone. Anything else is a real fault and belongs in the error boundary.
    if (!(error instanceof ApiUnavailableError)) throw error;
    unreachable = true;
  }

  if (unreachable) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader>API not reachable</CardHeader>
          <CardBody>
            <p className="text-text-muted">
              Start it with <code className="text-text">npm run dev</code> from the repository
              root. On a fresh clone, copy{" "}
              <code className="text-text">apps/api/.env.example</code> to{" "}
              <code className="text-text">apps/api/.env</code>, point DATABASE_URL at a Postgres
              database, then run{" "}
              <code className="text-text">npm run db:push &amp;&amp; npm run db:seed</code>.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const items = page?.items ?? [];
  const paging = params.cursor !== undefined;
  const firstPageHref = (() => {
    const search = toQuery(params);
    search.delete("cursor");
    const q = search.toString();
    return q ? `/?${q}` : "/";
  })();

  return (
    <Layout>
      <LayoutHeader>
        <SiteHeader categories={categories} activeCategories={activeCategories} query={query} />
      </LayoutHeader>

      <Layout hasSider>
        <LayoutSider width={260}>
          <FilterRail
            categories={categories}
            params={params}
            activeCategories={activeCategories}
            activeBand={activeBand}
          />
        </LayoutSider>

        <LayoutContent>
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h1 className="text-xl font-semibold">
                  {query ? `Results for “${query}”` : "All products"}
                </h1>
                <p className="mt-0.5 text-sm text-text-muted">
                  {/* Counts this page, not the whole result set. Keyset pagination
                      deliberately never runs a COUNT over the filtered set, so claiming
                      a total here would mean inventing one. */}
                  {items.length} {items.length === 1 ? "result" : "results"}
                  {page?.nextCursor ? " on this page" : ""}
                  {activeBand ? ` · ${activeBand}` : ""}
                </p>
              </div>
              <SortSelect params={params} value={sort} />
            </div>

            {items.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-medium">No products match those filters.</p>
                <p className="mt-1 text-sm text-text-muted">
                  Try removing a filter, or{" "}
                  <Link href="/" className="text-primary hover:underline">
                    start over
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {items.map((product) => (
                  <li key={product.id}>
                    <ProductTile product={product} />
                  </li>
                ))}
              </ul>
            )}

            {page?.nextCursor || paging ? (
              <nav
                aria-label="Pagination"
                className="mt-8 flex items-center justify-center gap-3 border-t border-border pt-6"
              >
                {paging ? (
                  <Link
                    href={firstPageHref}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                  >
                    First page
                  </Link>
                ) : null}
                {page?.nextCursor ? (
                  <Link
                    href={withCursor(params, page.nextCursor)}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                  >
                    Next page
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </LayoutContent>
      </Layout>

      <LayoutFooter>
        <div className="mx-auto max-w-7xl px-4 text-sm text-text-muted">
          A portfolio project. Built on{" "}
          <a
            href="https://github.com/nafuza1299/catalyst-ui"
            className="text-primary hover:underline"
          >
            catalyst-ui
          </a>
          . Not a real store — nothing here is for sale.
        </div>
      </LayoutFooter>
    </Layout>
  );
}
