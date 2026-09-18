import Link from "next/link";
import type { CategoryDto } from "@repo/shared/schemas";
import { formatPrice } from "@/lib/api";
import { toggleValue, withParams, type Params } from "@/lib/search-params";

/*
  The left rail every catalog page has: departments as toggles, then price bands, then
  a way back to everything.

  Each control is a link to the same page with one parameter changed, so the rail is
  server-rendered with no client state and works with JavaScript off. Checkbox-looking
  toggles are links rather than <input type="checkbox"> on purpose — a real checkbox
  would need JS to navigate, and a form wrapper would make each toggle a submit.

  Prices are fixed bands rather than two number inputs. A shopper picking a band is one
  click; a min/max pair is two fields and a submit, and the API validates the ordering
  anyway. The band edges are chosen against the seeded catalog so none of them is empty.
*/

const PRICE_BANDS: { label: string; minCents?: number; maxCents?: number }[] = [
  { label: "Under $30", maxCents: 2999 },
  { label: "$30 to $60", minCents: 3000, maxCents: 5999 },
  { label: "$60 to $150", minCents: 6000, maxCents: 14999 },
  { label: "$150 to $300", minCents: 15000, maxCents: 29999 },
  { label: "$300 & above", minCents: 30000 },
];

const Check = ({ on }: { on: boolean }) => (
  <span
    aria-hidden="true"
    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
      on ? "border-primary bg-primary text-primary-fg" : "border-border"
    }`}
  >
    {on ? (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
        <path d="M3 8.5l3.5 3.5L13 5" />
      </svg>
    ) : null}
  </span>
);

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-border py-4 last:border-b-0">
    <h3 className="mb-2 text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

export function FilterRail({
  categories,
  params,
  activeCategories,
  activeBand,
}: {
  categories: CategoryDto[];
  params: Params;
  activeCategories: string[];
  activeBand: string | null;
}) {
  const filtered =
    activeCategories.length > 0 || activeBand !== null || params.q !== undefined;

  return (
    <div className="px-4 py-2">
      <Group title="Department">
        <ul className="space-y-0.5">
          {categories.map((category) => {
            const on = activeCategories.includes(category.slug);
            return (
              <li key={category.slug}>
                <Link
                  href={toggleValue(params, "category", category.slug)}
                  aria-pressed={on}
                  className="flex items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-surface-hover"
                >
                  <Check on={on} />
                  <span className={on ? "font-medium text-text" : "text-text-muted"}>
                    {category.name}
                  </span>
                  <span className="ml-auto text-xs text-text-muted">{category.productCount}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Group>

      <Group title="Price">
        <ul className="space-y-0.5">
          {PRICE_BANDS.map((band) => {
            const on = activeBand === band.label;
            // Selecting a band sets both bounds together; clicking the active one
            // clears both. Setting them in separate links would let a user strand the
            // page on a half-applied range.
            const next = on
              ? withParams(params, { minCents: null, maxCents: null })
              : withParams(params, {
                  minCents: band.minCents?.toString() ?? null,
                  maxCents: band.maxCents?.toString() ?? null,
                });
            return (
              <li key={band.label}>
                <Link
                  href={next}
                  aria-pressed={on}
                  className="flex items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-surface-hover"
                >
                  <Check on={on} />
                  <span className={on ? "font-medium text-text" : "text-text-muted"}>
                    {band.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Group>

      {filtered ? (
        <div className="py-3">
          <Link href="/" className="text-sm text-primary hover:underline">
            Clear all filters
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export const priceBandLabel = (min?: number, max?: number): string | null =>
  PRICE_BANDS.find((b) => b.minCents === min && b.maxCents === max)?.label ?? null;

export { PRICE_BANDS, formatPrice };
