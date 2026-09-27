import { CatalogView } from "@/components/catalog-view";
import type { Params } from "@/lib/search-params";

// Every filtered, sorted or searched catalog view, rendered per request.
export default async function BrowsePage({ searchParams }: { searchParams: Promise<Params> }) {
  return <CatalogView params={await searchParams} />;
}
