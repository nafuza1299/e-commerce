import { Skeleton } from "@/ui";

/*
  Root-level, not per-route: the app is small enough that one loading state
  covers every page reasonably, and this only actually shows up on a cache miss
  under the catalog's ~60s ISR window or a slow first load.
*/
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-24" />
      <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <Skeleton shape="rect" className="aspect-square w-full" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-5 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}
