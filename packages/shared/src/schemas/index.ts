import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { products } from "../db/schema";

/*
  Every schema here is imported by BOTH apps/api (as runtime request validation and
  as the source of the OpenAPI document) and apps/web (as react-hook-form resolvers
  and as the client's types). Changing one is what makes both sides fail to compile
  together, which is the entire reason this is a shared package and not two copies.
*/

/**
 * A repeated query key (`?category=a&category=b`) arrives as an array, a single one
 * as a bare string, and an absent one as undefined. Normalising here is what lets
 * every consumer just treat it as an array.
 */
const stringList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]));

// ---------------------------------------------------------------- catalog (read)

export const productDto = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int(),
  imageUrl: z.string().nullable(),
  stock: z.number().int(),
  categories: z.array(z.object({ slug: z.string(), name: z.string() })),
});

export const catalogQuery = z
  .object({
    q: z.string().trim().min(1).optional(),
    category: stringList,
    minCents: z.coerce.number().int().nonnegative().optional(),
    maxCents: z.coerce.number().int().nonnegative().optional(),
    sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
    // Opaque to the client on purpose: it encodes (created_at, id) so the page
    // boundary survives products being inserted while someone is paging.
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(48).default(24),
  })
  .refine((v) => v.minCents === undefined || v.maxCents === undefined || v.minCents <= v.maxCents, {
    message: "minCents must not be greater than maxCents",
    path: ["minCents"],
  });

export const catalogPage = z.object({
  items: z.array(productDto),
  nextCursor: z.string().nullable(),
});

/**
 * Departments for the filter rail. `productCount` counts active products only, so a
 * category showing (0) is genuinely empty to a shopper rather than merely unpublished.
 */
export const categoryDto = z.object({
  slug: z.string(),
  name: z.string(),
  productCount: z.number().int(),
});

export const categoryList = z.array(categoryDto);

// --------------------------------------------------------------- checkout (write)

/*
  This schema is the trust boundary, and what it LEAVES OUT is the point: the client
  sends product ids and quantities, never prices. The server re-reads every price
  from the database before it totals anything.

  Accepting a client-supplied price here would let anyone post their own — the
  classic "buy a laptop for one cent" bug. The cart in the browser holds prices only
  so it can render a subtotal; that number is a display convenience and is never
  authoritative.
*/
// Messages are written for the person filling in the form. The same schema drives
// the API's 400 responses, so they read sensibly there too — and they are written
// once, not once per side.
export const checkoutInput = z.object({
  email: z.email("Enter a valid email address"),
  shippingName: z.string().trim().min(1, "Enter your name").max(120, "Too long"),
  shippingLine1: z.string().trim().min(1, "Enter your address").max(200, "Too long"),
  shippingCity: z.string().trim().min(1, "Enter your city").max(120, "Too long"),
  shippingPostalCode: z.string().trim().min(1, "Enter your postal code").max(20, "Too long"),
  shippingCountry: z
    .string()
    .trim()
    .length(2, "Use the 2-letter country code, e.g. ID or US")
    .toUpperCase(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

export const orderItemDto = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  name: z.string(),
  quantity: z.number().int(),
  unitPriceCents: z.number().int(),
});

export const orderDto = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "paid", "shipped", "cancelled"]),
  totalCents: z.number().int(),
  email: z.string(),
  createdAt: z.string(),
  items: z.array(orderItemDto),
});

// ------------------------------------------------------------------ admin (write)

/*
  Derived from the Drizzle table rather than written out again, so adding a column
  upstream cannot leave this silently accepting the old shape. id and createdAt are
  database-generated, so they are not part of the input.
*/
export const adminProductInput = createInsertSchema(products, {
  slug: (s) =>
    s.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words joined by single hyphens"),
  name: (s) => s.trim().min(1).max(200),
  description: (s) => s.max(4000),
  priceCents: (s) => s.int().positive(),
  stock: (s) => s.int().nonnegative(),
}).omit({ id: true, createdAt: true });

export const adminProductPatch = adminProductInput.partial();

export const idParam = z.object({ id: z.uuid() });
export const slugParam = z.object({ slug: z.string().min(1) });

/** The shape of every non-2xx body, so it appears in the OpenAPI document too. */
export const errorDto = z.object({
  error: z.string(),
  message: z.string(),
});

export type ProductDto = z.infer<typeof productDto>;
export type CategoryDto = z.infer<typeof categoryDto>;
export type CatalogQuery = z.infer<typeof catalogQuery>;
export type CatalogPage = z.infer<typeof catalogPage>;
export type CheckoutInput = z.infer<typeof checkoutInput>;
export type OrderDto = z.infer<typeof orderDto>;
export type AdminProductInput = z.infer<typeof adminProductInput>;
