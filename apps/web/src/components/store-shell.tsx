import type { ReactNode } from "react";
import type { CategoryDto } from "@repo/shared/schemas";
import { SiteHeader } from "@/components/site-header";
import { ApiUnavailableError, fetchCategories } from "@/lib/api";
import { Layout, LayoutFooter, LayoutHeader } from "@/ui";

/*
  Header and footer for every storefront page. A server component, not a Next
  layout, because the header needs the current search query and active departments
  to render its own state — and layouts do not receive searchParams.

  The catalog already fetched the category list for its rail and passes it in; other
  pages let this fetch it.
*/
export async function StoreShell({
  children,
  categories,
  activeCategories = [],
  query,
}: {
  children: ReactNode;
  categories?: CategoryDto[];
  activeCategories?: string[];
  query?: string;
}) {
  let departments = categories ?? [];
  if (!categories) {
    try {
      departments = await fetchCategories();
    } catch (error) {
      // A missing API should not take the header down with it on a page whose own
      // content will explain the problem.
      if (!(error instanceof ApiUnavailableError)) throw error;
    }
  }

  return (
    <Layout>
      <LayoutHeader>
        <SiteHeader categories={departments} activeCategories={activeCategories} query={query} />
      </LayoutHeader>

      {children}

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
