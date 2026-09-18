import Link from "next/link";
import type { CategoryDto } from "@repo/shared/schemas";
import { CartButton } from "@/components/cart-button";
import { ThemeToggleSlot } from "@/components/theme-toggle-slot";
import { Button, MenuBar, MenuBarActions, MenuBarBrand, MenuBarNav } from "@/ui";

/*
  The storefront header follows the shape every large retailer converged on: brand,
  a search field wide enough to dominate the bar, a departments row, and account and
  cart affordances trailing right.

  The search is a plain GET form. Submitting navigates to /?q=... with no JavaScript
  involved, which is also what makes the result page linkable and cacheable.

  MenuBar.Nav is hidden below md: by the component itself, so the departments row is
  its own element underneath rather than inside Nav — on a phone the departments stay
  reachable as a scrolling strip instead of disappearing into a hamburger.
*/

export function SiteHeader({
  categories,
  activeCategories,
  query,
}: {
  categories: CategoryDto[];
  activeCategories: string[];
  query?: string;
}) {
  return (
    <div className="border-b border-border">
      <MenuBar>
        <MenuBarBrand>
          <Link href="/" className="text-lg font-semibold whitespace-nowrap">
            catalyst<span className="text-primary">commerce</span>
          </Link>
        </MenuBarBrand>

        <MenuBarNav className="min-w-0 flex-1">
          <form action="/" method="get" role="search" className="flex w-full max-w-2xl gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Search the catalog"
              aria-label="Search the catalog"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {/* Category selections survive a search so the two filters compose,
                the way they do on any real storefront. */}
            {activeCategories.map((slug) => (
              <input key={slug} type="hidden" name="category" value={slug} />
            ))}
            <Button type="submit">Search</Button>
          </form>
        </MenuBarNav>

        <MenuBarActions>
          <ThemeToggleSlot />
          <CartButton />
        </MenuBarActions>
      </MenuBar>

      <nav aria-label="Departments" className="overflow-x-auto border-t border-border">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-1.5 text-sm">
          <li>
            <Link
              href="/"
              className="block rounded px-2.5 py-1 whitespace-nowrap text-text-muted hover:bg-surface-hover hover:text-text"
            >
              All
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/?category=${encodeURIComponent(category.slug)}`}
                aria-current={activeCategories.includes(category.slug) ? "page" : undefined}
                className={`block rounded px-2.5 py-1 whitespace-nowrap hover:bg-surface-hover hover:text-text ${
                  activeCategories.includes(category.slug)
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted"
                }`}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
