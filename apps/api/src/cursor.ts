/*
  Keyset pagination. A cursor carries the sort value and the id of the last row on
  the page; the next query asks for rows strictly past that pair.

  Offset pagination would be shorter and wrong. Insert a product while someone is
  paging and every later row shifts by one, so page 2 repeats an item from page 1 or
  skips one — and nothing in the response reveals it happened. The id rides along as
  a tie-breaker, because rows can share a sort value (two products created in the
  same transaction, or priced identically) and a page boundary needs a total order.

  Opaque base64url on purpose: clients must not build these, which keeps the
  encoding free to change.
*/

// A null byte cannot appear in a Postgres text value, so no sort value can ever
// contain the separator. A space would work for today's timestamp and numeric
// cursors and would break the first time something sorts by name.
const SEP = String.fromCharCode(0);

export const encodeCursor = (sortValue: string, id: string): string =>
  Buffer.from(`${sortValue}${SEP}${id}`, "utf8").toString("base64url");

/**
 * Returns null for anything malformed rather than throwing. The cursor arrives from
 * the query string, so a garbage value is a 400 and not a 500 — and Buffer decodes
 * invalid base64 to junk silently rather than raising, so the shape must be checked
 * after decoding, not before.
 */
export const decodeCursor = (cursor: string): { sortValue: string; id: string } | null => {
  const parts = Buffer.from(cursor, "base64url").toString("utf8").split(SEP);
  if (parts.length !== 2) return null;
  const [sortValue, id] = parts;
  if (!sortValue || !id) return null;
  return { sortValue, id };
};
