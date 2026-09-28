import { CatalogView } from "@/components/catalog-view";

// Unfiltered catalog, prerendered at build and regenerated at most once a minute, or
// sooner when /api/revalidate busts the "products" tag. Filtered views live at /browse.
export const revalidate = 60;

export default function CatalogPage() {
  return <CatalogView params={{}} />;
}
