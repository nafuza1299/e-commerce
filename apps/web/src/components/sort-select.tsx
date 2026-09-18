"use client";

import { useRouter } from "next/navigation";
import { withParam, type Params } from "@/lib/search-params";

/*
  The one control on the catalog page that genuinely needs JavaScript. A native <select>
  cannot navigate on its own, and the alternatives are worse: three links reads as a
  toolbar rather than a sort control, and a GET form needs a visible submit button next
  to a dropdown that looks like it should apply itself.

  Everything else on this page — search, departments, price bands, pagination — is a
  link or a plain form and needs no client bundle at all.
*/
const OPTIONS = [
  { value: "newest", label: "Newest arrivals" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function SortSelect({ params, value }: { params: Params; value: string }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="whitespace-nowrap text-text-muted">Sort by</span>
      <select
        value={value}
        onChange={(event) => router.push(withParam(params, "sort", event.target.value))}
        className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
