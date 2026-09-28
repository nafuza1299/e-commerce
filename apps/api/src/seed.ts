import { categories, orderItems, orders, productCategories, products } from "@repo/shared/db";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { env } from "./env";

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

/** [name, priceCents, stock, category slugs, status, image search query] */
const ITEMS: [string, number, number, string[], "active" | "draft" | "archived", string][] = [
  ["Tenkeyless Mechanical Keyboard", 12900, 24, ["keyboards"], "active", "mechanical keyboard"],
  ["Low-Profile Wireless Keyboard", 9900, 40, ["keyboards"], "active", "wireless keyboard"],
  ["Split Ergonomic Keyboard", 22900, 8, ["keyboards"], "active", "ergonomic keyboard"],
  ["Keycap Set — Nordic", 4500, 60, ["keyboards", "accessories"], "active", "keycaps"],
  ["Silent Tactile Switches (70x)", 3200, 120, ["keyboards", "accessories"], "active", "keyboard switches"],
  ["Open-Back Studio Headphones", 17900, 15, ["audio"], "active", "studio headphones"],
  ["USB-C Audio Interface", 21900, 6, ["audio"], "active", "audio interface"],
  ["Cardioid Condenser Microphone", 13900, 18, ["audio"], "active", "condenser microphone"],
  ["Desk Boom Arm", 5900, 30, ["audio", "desk"], "active", "microphone boom arm"],
  ["Monitor Isolation Pads", 2900, 44, ["audio", "desk"], "active", "studio monitor speakers"],
  ["27-inch 4K IPS Display", 42900, 5, ["displays"], "active", "computer monitor"],
  ["34-inch Ultrawide Display", 68900, 3, ["displays"], "active", "ultrawide monitor"],
  ["Portable 15-inch Display", 24900, 11, ["displays"], "active", "portable monitor"],
  ["Single Monitor Arm", 8900, 26, ["displays", "desk"], "active", "monitor arm"],
  ["Dual Monitor Arm", 14900, 12, ["displays", "desk"], "active", "dual monitor setup"],
  ["Standing Desk Converter", 19900, 7, ["desk"], "active", "standing desk"],
  ["Bamboo Desk Mat", 3900, 55, ["desk", "accessories"], "active", "desk mat"],
  ["Cable Management Tray", 2400, 80, ["desk", "accessories"], "active", "cable management"],
  ["Under-Desk Drawer", 4900, 21, ["desk"], "active", "desk drawer"],
  ["Laptop Riser", 3400, 38, ["desk", "accessories"], "active", "laptop stand"],
  ["USB-C Docking Station", 18900, 14, ["accessories"], "active", "usb hub"],
  ["Braided USB-C Cable (2m)", 1500, 200, ["accessories"], "active", "usb cable"],
  ["Wrist Rest — Walnut", 3900, 33, ["accessories"], "active", "wooden wrist rest"],
  ["Precision Wireless Mouse", 7900, 27, ["accessories"], "active", "computer mouse"],
  ["Travel Pouch", 2200, 48, ["accessories"], "active", "tech pouch"],
  ["Mechanical Numpad", 5400, 19, ["keyboards"], "active", "numeric keypad"],
  // Deliberately not active: the catalog must never return these, and the admin
  // list must. Without them nothing proves the status filter is doing anything.
  ["Prototype Haptic Keypad", 15900, 0, ["keyboards"], "draft", "keypad"],
  ["Discontinued 24-inch Display", 19900, 0, ["displays"], "archived", "old monitor"],
];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);

/**
 * A relevant photo: Pexels search by keyword, then one result picked by a hash of the
 * slug — varied across products, and the same for a product on every reseed as long
 * as Pexels returns the same results. Any failure is a warning, never a failed seed.
 */
type Image = { imageUrl: string; imageCreditName: string; imageCreditUrl: string };
type PexelsPhoto = { url: string; photographer: string; src: { original: string } };

const imageFor = async (key: string, query: string, slug: string): Promise<Image | null> => {
  try {
    const search = new URLSearchParams({ query, per_page: "15", orientation: "square" });
    const res = await fetch(`https://api.pexels.com/v1/search?${search}`, {
      headers: { Authorization: key },
    });
    if (!res.ok) throw new Error(`Pexels responded ${res.status}`);
    const { photos } = (await res.json()) as { photos: PexelsPhoto[] };
    const photo = photos[hash(slug) % photos.length];
    if (!photo) throw new Error("no results");
    return {
      // Square crop to match the aspect-square thumbnails; the same params Pexels
      // uses for its own src variants.
      imageUrl: `${photo.src.original}?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop`,
      // Pexels asks for "Photo by <name> on Pexels" linking to the photo's page.
      imageCreditName: photo.photographer,
      imageCreditUrl: photo.url,
    };
  } catch (error) {
    console.warn(`No image for ${slug}: ${(error as Error).message}`);
    return null;
  }
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const main = async () => {
  const key = env.PEXELS_API_KEY;
  if (!key) console.log("PEXELS_API_KEY not set; products keep the initials placeholder.");
  // Before the truncate, so a slow or failing network cannot leave the tables emptied.
  const images = await Promise.all(
    ITEMS.map(([name, , , , , query]) => (key ? imageFor(key, query, slugify(name)) : null)),
  );

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
    ...images[i],
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
    `Seeded ${insertedCategories.length} categories and ${insertedProducts.length} products (${active} active, ${images.filter(Boolean).length} with images).`,
  );

  await revalidateCatalog();
  process.exit(0);
};

/**
 * Busts the web app's ~60s catalog/product cache so visitors see the reseeded
 * catalog immediately. Best-effort: any failure just means the ISR window runs
 * its course instead, never a failed seed.
 */
const revalidateCatalog = async () => {
  const secret = env.REVALIDATE_SECRET;
  if (!secret) {
    console.log("REVALIDATE_SECRET not set; catalog cache clears on its own within ~60s.");
    return;
  }
  try {
    const res = await fetch(`${env.WEB_ORIGIN}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) throw new Error(`responded ${res.status}`);
    console.log("Catalog cache revalidated.");
  } catch (error) {
    console.warn(`Could not revalidate the catalog cache: ${(error as Error).message}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
