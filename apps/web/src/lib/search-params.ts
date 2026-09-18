export type Params = Record<string, string | string[] | undefined>;

/*
  Filters are plain links and a GET form, not client state. The URL already is the
  filter state: it survives a reload, it is shareable, the back button steps through
  filter history for free, and none of it needs JavaScript to work. Reaching for a
  client store here would add a hydration boundary and a second source of truth for
  something the platform already models.
*/

const toSearch = (params: Params): URLSearchParams => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const v of value) search.append(key, v);
    else if (value !== undefined) search.set(key, value);
  }
  return search;
};

export const asList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const href = (search: URLSearchParams): string => {
  // Every filter change returns to page one. A cursor encodes a position within one
  // specific ordered, filtered result set — carrying it across a filter change points
  // into a set that no longer exists, and the page silently starts from the wrong row.
  search.delete("cursor");
  const query = search.toString();
  return query ? `/?${query}` : "/";
};

/** Href with `value` added to, or removed from, a repeatable key such as `category`. */
export const toggleValue = (params: Params, key: string, value: string): string => {
  const search = toSearch(params);
  const current = search.getAll(key);
  search.delete(key);
  for (const v of current) if (v !== value) search.append(key, v);
  if (!current.includes(value)) search.append(key, value);
  return href(search);
};

/** Href with a single-valued key set, or removed when `value` is null. */
export const withParam = (params: Params, key: string, value: string | null): string => {
  const search = toSearch(params);
  if (value === null || value === "") search.delete(key);
  else search.set(key, value);
  return href(search);
};

/**
 * Href with several single-valued keys changed at once; a null value removes its key.
 *
 * Needed because these calls do not nest: withParam returns an href, not Params. A
 * price band has to set min and max together — applying them one at a time would let a
 * click land on a half-applied range.
 */
export const withParams = (params: Params, changes: Record<string, string | null>): string => {
  const search = toSearch(params);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") search.delete(key);
    else search.set(key, value);
  }
  return href(search);
};

/** Href for the next page — the one place a cursor is deliberately kept. */
export const withCursor = (params: Params, cursor: string): string => {
  const search = toSearch(params);
  search.set("cursor", cursor);
  const query = search.toString();
  return query ? `/?${query}` : "/";
};

export const toQuery = toSearch;
