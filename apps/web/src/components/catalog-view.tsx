import Link from "next/link";
import { FilterRail, priceBandLabel } from "@/components/filter-rail";
import { InfiniteGrid } from "@/components/infinite-grid";
import { StoreShell } from "@/components/store-shell";
import { SortSelect } from "@/components/sort-select";
import {
  ApiUnavailableError,
  CATALOG_PAGE_SIZE,
  fetchCatalog,
  fetchCategories,
} from "@/lib/api";
import { asList, catalogHref, toQuery, withCursor, type Params } from "@/lib/search-params";
import { Card, CardBody, CardHeader, Layout, LayoutContent, LayoutSider } from "@/ui";

/*
  The catalog, shared by the static `/` and the dynamic `/browse` that serves every
  filtered view. Server-rendered either way: the first page arrives as HTML, and only
  the sort dropdown, the theme toggle and the infinite scroll need client JavaScript.
*/

const NAV = "mt-8 flex items-center justify-center gap-3 border-t border-border pt-6";
const PAGE_LINK = "rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-hover";

const one = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const num = (value: string | string[] | undefined): number | undefined => {
  const raw = one(value);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function CatalogView({ params, init }: { params: Params; init?: RequestInit }) {
  const activeCategories = asList(params.category);
  const query = one(params.q);
  const sort = one(params.sort) ?? "newest";
  const activeBand = priceBandLabel(num(params.minCents), num(params.maxCents));

  const search = toQuery(params);
  search.set("limit", String(CATALOG_PAGE_SIZE));

  // Independent requests, so they overlap rather than queue.
  let page: Awaited<ReturnType<typeof fetchCatalog>> | null = null;
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  let unreachable = false;
  try {
    [page, categories] = await Promise.all([fetchCatalog(search, init), fetchCategories(init)]);
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
    const first = toQuery(params);
    first.delete("cursor");
    return catalogHref(first);
  })();
  const nextHref = page?.nextCursor ? withCursor(params, page.nextCursor) : null;
  const scrollQuery = (() => {
    const next = new URLSearchParams(search);
    next.delete("cursor");
    return next.toString();
  })();

  return (
    <StoreShell categories={categories} activeCategories={activeCategories} query={query}>
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
                  {/* Keyset pagination deliberately never runs a COUNT over the filtered
                      set, so "+" is as much as can honestly be claimed about a total. */}
                  {items.length}
                  {page?.nextCursor ? "+" : ""} {items.length === 1 ? "result" : "results"}
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
              // Keyed by the full query so changing a filter starts a fresh list instead
              // of appending to the previous result set's scrolled-in pages.
              <InfiniteGrid
                key={toQuery(params).toString()}
                initialItems={items}
                initialCursor={page?.nextCursor ?? null}
                query={scrollQuery}
              />
            )}

            {/* Infinite scroll replaces "Next page"; without JavaScript it still pages. */}
            {paging ? (
              <nav aria-label="Pagination" className={NAV}>
                <Link href={firstPageHref} className={PAGE_LINK}>
                  First page
                </Link>
                {nextHref ? (
                  <noscript>
                    <a href={nextHref} className={PAGE_LINK}>
                      Next page
                    </a>
                  </noscript>
                ) : null}
              </nav>
            ) : nextHref ? (
              <noscript>
                <nav aria-label="Pagination" className={NAV}>
                  <a href={nextHref} className={PAGE_LINK}>
                    Next page
                  </a>
                </nav>
              </noscript>
            ) : null}
          </div>
        </LayoutContent>
      </Layout>
    </StoreShell>
  );
}
