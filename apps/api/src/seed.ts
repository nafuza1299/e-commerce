import { categories, orderItems, orders, productCategories, products } from "@repo/shared/db";
import { sql } from "drizzle-orm";
import { db } from "./db";

/*
  Deterministic on purpose — no faker. A demo that reshuffles its own data on every
  seed makes screenshots, e2e assertions and "does pagination actually work" all
  harder to trust than they need to be.
*/

const CATEGORIES = [
  { slug: "keyboards", name: "Keyboards" },
  { slug: "audio", name: "Audio" },
  { slug: "displays", name: "Displays" },
  { slug: "desk", name: "Desk" },
  { slug: "accessories", name: "Accessories" },
];

/** [name, priceCents, stock, category slugs, status] */
const ITEMS: [string, number, number, string[], "active" | "draft" | "archived"][] = [
  ["Tenkeyless Mechanical Keyboard", 12900, 24, ["keyboards"], "active"],
  ["Low-Profile Wireless Keyboard", 9900, 40, ["keyboards"], "active"],
  ["Split Ergonomic Keyboard", 22900, 8, ["keyboards"], "active"],
  ["Keycap Set — Nordic", 4500, 60, ["keyboards", "accessories"], "active"],
  ["Silent Tactile Switches (70x)", 3200, 120, ["keyboards", "accessories"], "active"],
  ["Open-Back Studio Headphones", 17900, 15, ["audio"], "active"],
  ["USB-C Audio Interface", 21900, 6, ["audio"], "active"],
  ["Cardioid Condenser Microphone", 13900, 18, ["audio"], "active"],
  ["Desk Boom Arm", 5900, 30, ["audio", "desk"], "active"],
  ["Monitor Isolation Pads", 2900, 44, ["audio", "desk"], "active"],
  ["27-inch 4K IPS Display", 42900, 5, ["displays"], "active"],
  ["34-inch Ultrawide Display", 68900, 3, ["displays"], "active"],
  ["Portable 15-inch Display", 24900, 11, ["displays"], "active"],
  ["Single Monitor Arm", 8900, 26, ["displays", "desk"], "active"],
  ["Dual Monitor Arm", 14900, 12, ["displays", "desk"], "active"],
  ["Standing Desk Converter", 19900, 7, ["desk"], "active"],
  ["Bamboo Desk Mat", 3900, 55, ["desk", "accessories"], "active"],
  ["Cable Management Tray", 2400, 80, ["desk", "accessories"], "active"],
  ["Under-Desk Drawer", 4900, 21, ["desk"], "active"],
  ["Laptop Riser", 3400, 38, ["desk", "accessories"], "active"],
  ["USB-C Docking Station", 18900, 14, ["accessories"], "active"],
  ["Braided USB-C Cable (2m)", 1500, 200, ["accessories"], "active"],
  ["Wrist Rest — Walnut", 3900, 33, ["accessories"], "active"],
  ["Precision Wireless Mouse", 7900, 27, ["accessories"], "active"],
  ["Travel Pouch", 2200, 48, ["accessories"], "active"],
  ["Mechanical Numpad", 5400, 19, ["keyboards"], "active"],
  // Deliberately not active: the catalog must never return these, and the admin
  // list must. Without them nothing proves the status filter is doing anything.
  ["Prototype Haptic Keypad", 15900, 0, ["keyboards"], "draft"],
  ["Discontinued 24-inch Display", 19900, 0, ["displays"], "archived"],
];

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const main = async () => {
  // CASCADE also clears product_categories and any orders, so a reseed cannot
  // leave order rows pointing at products that no longer exist.
  await db.execute(
    sql`truncate table ${orderItems}, ${orders}, ${productCategories}, ${products}, ${categories} restart identity cascade`,
  );

  const insertedCategories = await db.insert(categories).values(CATEGORIES).returning();
  const categoryId = new Map(insertedCategories.map((c) => [c.slug, c.id]));

  // Spread createdAt backwards an hour at a time so "newest" has a stable,
  // meaningful order instead of every row sharing one timestamp.
  const now = Date.now();
  const rows = ITEMS.map(([name, priceCents, stock, _cats, status], i) => ({
    slug: slugify(name),
    name,
    description: `${name}. Seed data for the catalyst-commerce demo storefront.`,
    priceCents,
    stock,
    status,
    createdAt: new Date(now - i * 3_600_000),
  }));

  const insertedProducts = await db.insert(products).values(rows).returning();
  const productId = new Map(insertedProducts.map((p) => [p.slug, p.id]));

  const links = ITEMS.flatMap(([name, , , cats]) =>
    cats.map((slug) => ({
      productId: productId.get(slugify(name))!,
      categoryId: categoryId.get(slug)!,
    })),
  );
  await db.insert(productCategories).values(links);

  const active = ITEMS.filter(([, , , , s]) => s === "active").length;
  console.log(
    `Seeded ${insertedCategories.length} categories and ${insertedProducts.length} products (${active} active).`,
  );
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
