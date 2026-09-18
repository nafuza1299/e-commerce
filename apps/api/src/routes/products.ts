import { categories, productCategories, products } from "@repo/shared/db";
import {
  catalogPage,
  catalogQuery,
  categoryList,
  errorDto,
  productDto,
  slugParam,
} from "@repo/shared/schemas";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, sql, type SQL } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { decodeCursor, encodeCursor } from "../cursor";
import { db } from "../db";

type Cursor = { sortValue: string; id: string };
type Sort = "newest" | "price-asc" | "price-desc";

/*
  Each sort is a (column, direction) pair plus the matching cursor comparison, and
  the two must agree or pagination silently walks the wrong way.

  The comparison is a row-value expression — `(a, b) < (x, y)` — rather than the
  hand-expanded `a < x OR (a = x AND b < y)`. Postgres compares the tuple
  lexicographically in one shot, it matches the composite index directly, and the
  expanded form is where the AND/OR precedence bug usually lives.
*/
const buildSort = (
  sort: Sort,
  cursor: Cursor | null,
): { orderBy: SQL[]; seek: SQL | undefined; encode: (row: Row) => string } | null => {
  switch (sort) {
    case "newest":
      return {
        orderBy: [desc(products.createdAt), desc(products.id)],
        seek: cursor
          ? sql`(${products.createdAt}, ${products.id}) < (${cursor.sortValue}::timestamptz, ${cursor.id}::uuid)`
          : undefined,
        encode: (row) => row.createdAt.toISOString(),
      };
    case "price-asc":
    case "price-desc": {
      // The cursor half of a price sort is a number that arrived as text from the
      // query string. Reject a non-numeric one here rather than letting Postgres
      // raise on the cast, which would be a 500 for what is a malformed request.
      const price = cursor ? Number(cursor.sortValue) : null;
      if (cursor && !Number.isInteger(price)) return null;

      const ascending = sort === "price-asc";
      return {
        orderBy: ascending
          ? [asc(products.priceCents), asc(products.id)]
          : [desc(products.priceCents), desc(products.id)],
        seek: cursor
          ? ascending
            ? sql`(${products.priceCents}, ${products.id}) > (${price}::int, ${cursor.id}::uuid)`
            : sql`(${products.priceCents}, ${products.id}) < (${price}::int, ${cursor.id}::uuid)`
          : undefined,
        encode: (row) => String(row.priceCents),
      };
    }
  }
};

const selection = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  description: products.description,
  priceCents: products.priceCents,
  imageUrl: products.imageUrl,
  stock: products.stock,
  createdAt: products.createdAt,
};

/** Only what a cursor is built from — deriving the whole row here bought nothing. */
type Row = { id: string; priceCents: number; createdAt: Date };

/**
 * One extra query for the categories of the products on this page, keyed back by
 * product id. Not a join: joining would multiply each product by its category count
 * and leave the rows to be folded back together, which is where the duplicate-product
 * bug comes from. Not per-product either — that is the N+1.
 */
const categoriesFor = async (ids: string[]) => {
  const byProduct = new Map<string, { slug: string; name: string }[]>();
  if (ids.length === 0) return byProduct;

  const rows = await db
    .select({
      productId: productCategories.productId,
      slug: categories.slug,
      name: categories.name,
    })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(inArray(productCategories.productId, ids));

  for (const row of rows) {
    const list = byProduct.get(row.productId);
    if (list) list.push({ slug: row.slug, name: row.name });
    else byProduct.set(row.productId, [{ slug: row.slug, name: row.name }]);
  }
  return byProduct;
};

export const productRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/products",
    {
      schema: {
        tags: ["catalog"],
        summary: "List active products",
        description:
          "Keyset-paginated. Pass the returned nextCursor back as `cursor` for the next page; a null nextCursor means this was the last one.",
        querystring: catalogQuery,
        response: { 200: catalogPage, 400: errorDto },
      },
    },
    async (request, reply) => {
      const query = request.query;

      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      if (query.cursor && !cursor) {
        return reply.code(400).send({ error: "bad_cursor", message: "Malformed cursor." });
      }

      const sort = buildSort(query.sort, cursor);
      if (!sort) {
        return reply
          .code(400)
          .send({ error: "bad_cursor", message: "Cursor does not match the requested sort." });
      }

      // Only active products are ever public. Draft and archived ones stay
      // invisible here no matter what the rest of the query asks for.
      const conditions: SQL[] = [eq(products.status, "active")];
      if (sort.seek) conditions.push(sort.seek);
      if (query.q) conditions.push(ilike(products.name, `%${query.q}%`));
      if (query.minCents !== undefined) conditions.push(gte(products.priceCents, query.minCents));
      if (query.maxCents !== undefined) conditions.push(lte(products.priceCents, query.maxCents));
      if (query.category.length > 0) {
        conditions.push(
          inArray(
            products.id,
            db
              .select({ id: productCategories.productId })
              .from(productCategories)
              .innerJoin(categories, eq(categories.id, productCategories.categoryId))
              .where(inArray(categories.slug, query.category)),
          ),
        );
      }

      // limit + 1 is how the response knows whether a next page exists without
      // running a second COUNT over the whole filtered set.
      const rows = await db
        .select(selection)
        .from(products)
        .where(and(...conditions))
        .orderBy(...sort.orderBy)
        .limit(query.limit + 1);

      const hasMore = rows.length > query.limit;
      const page = hasMore ? rows.slice(0, query.limit) : rows;
      const last = page.at(-1);
      const byProduct = await categoriesFor(page.map((r) => r.id));

      return {
        items: page.map(({ createdAt: _createdAt, ...product }) => ({
          ...product,
          categories: byProduct.get(product.id) ?? [],
        })),
        nextCursor: hasMore && last ? encodeCursor(sort.encode(last), last.id) : null,
      };
    },
  );

  app.get(
    "/categories",
    {
      schema: {
        tags: ["catalog"],
        summary: "Departments, with a count of the active products in each",
        response: { 200: categoryList },
      },
    },
    async () => {
      /*
        Two LEFT JOINs, not INNER: a category with nothing active in it still has to
        appear, showing (0). An inner join would drop it from the rail entirely, so a
        department would silently vanish the moment its last product was archived.

        The status filter sits in the JOIN condition rather than in a WHERE clause for
        the same reason — in WHERE it would discard the whole row, undoing the outer
        join. count(products.id) then ignores the NULLs an unmatched join produces.
      */
      return db
        .select({
          slug: categories.slug,
          name: categories.name,
          productCount: count(products.id),
        })
        .from(categories)
        .leftJoin(productCategories, eq(productCategories.categoryId, categories.id))
        .leftJoin(
          products,
          and(eq(products.id, productCategories.productId), eq(products.status, "active")),
        )
        .groupBy(categories.slug, categories.name)
        .orderBy(asc(categories.name));
    },
  );

  app.get(
    "/products/:slug",
    {
      schema: {
        tags: ["catalog"],
        summary: "Fetch one active product by slug",
        params: slugParam,
        response: { 200: productDto, 404: errorDto },
      },
    },
    async (request, reply) => {
      const [product] = await db
        .select(selection)
        .from(products)
        .where(and(eq(products.slug, request.params.slug), eq(products.status, "active")))
        .limit(1);

      if (!product) {
        return reply.code(404).send({ error: "not_found", message: "No such product." });
      }

      const { createdAt: _createdAt, ...rest } = product;
      const byProduct = await categoriesFor([product.id]);
      return { ...rest, categories: byProduct.get(product.id) ?? [] };
    },
  );
};
