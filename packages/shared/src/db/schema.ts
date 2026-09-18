import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
  Money is integer cents, and every column carrying it says so in its own name.
  Binary floating point cannot represent 0.10, so a `numeric`-as-float or a JS
  number of dollars drifts — and the way it surfaces is a cart total that
  disagrees with the sum of the lines that produced it. Naming the unit in the
  column makes the mistake visible at every call site instead of at checkout.

  These table definitions are plain objects with no driver dependency, which is
  why they can live in a shared package that the web app also resolves. Only the
  connection is server-only, and that stays in apps/api.
*/

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const orderStatus = pgEnum("order_status", ["pending", "paid", "shipped", "cancelled"]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    imageUrl: text("image_url"),
    stock: integer("stock").notNull().default(0),
    status: productStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    // The catalog pages by (created_at desc, id desc) within a status, and the
    // cursor carries both halves. id is the tie-breaker: without it, two products
    // sharing a created_at timestamp can straddle a page boundary, and the reader
    // either sees one twice or never sees it at all.
    index("products_catalog_idx").on(t.status, t.createdAt.desc(), t.id.desc()),
    // Sorting by price uses the same keyset shape on a different column. One index
    // serves both directions — Postgres can scan an index backwards.
    index("products_price_idx").on(t.status, t.priceCents, t.id),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("categories_slug_key").on(t.slug)],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    // The composite primary key already indexes product_id first, so filtering the
    // catalog by category (the other direction) would otherwise be a scan.
    index("product_categories_category_idx").on(t.categoryId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // better-auth owns the user table and issues text ids, so this is deliberately
    // not a uuid and deliberately not a foreign key — the auth schema is generated
    // by that library and is not ours to reference from here.
    userId: text("user_id").notNull(),
    status: orderStatus("status").notNull().default("pending"),
    totalCents: integer("total_cents").notNull(),
    email: text("email").notNull(),
    shippingName: text("shipping_name").notNull(),
    shippingLine1: text("shipping_line1").notNull(),
    shippingCity: text("shipping_city").notNull(),
    shippingPostalCode: text("shipping_postal_code").notNull(),
    shippingCountry: text("shipping_country").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_user_idx").on(t.userId, t.createdAt.desc())],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // restrict, not cascade: deleting a product must not silently rewrite the
    // history of what someone bought. Retiring a product is `status: archived`.
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    // name and unitPriceCents are snapshots taken at purchase time, not joins.
    // Products get renamed and repriced; an order has to keep saying what was
    // actually bought and what was actually charged.
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const productsRelations = relations(products, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));
