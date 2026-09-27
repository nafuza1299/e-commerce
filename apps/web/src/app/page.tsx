import { CatalogView } from "@/components/catalog-view";

// Unfiltered catalog, prerendered at build and regenerated at most once a minute.
// Filtered URLs never reach this page: proxy.ts rewrites them to /browse.
export const revalidate = 60;

export default function CatalogPage() {
  return <CatalogView params={{}} init={{ next: { revalidate: 60 } }} />;
}
