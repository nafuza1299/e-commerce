import { expect, test } from "@playwright/test";

/*
  The money path, end to end, against the real dev servers and the real seeded
  database — no mocked fetches. Uses a product from the deterministic seed
  (apps/api/src/seed.ts), so re-running this repeatedly does consume real stock;
  `npm run db:seed` resets it.
*/
test("browse, add to cart, and place an order", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();

  await page.getByRole("heading", { name: "Tenkeyless Mechanical Keyboard" }).click();
  await expect(page).toHaveURL(/\/p\/tenkeyless-mechanical-keyboard$/);
  await expect(page.getByRole("heading", { name: "Tenkeyless Mechanical Keyboard" })).toBeVisible();

  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("1 in your cart")).toBeVisible();

  await page.getByRole("button", { name: /Cart, 1 item/ }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("Tenkeyless Mechanical Keyboard")).toBeVisible();

  await page.getByRole("button", { name: "Proceed to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await page.getByLabel("Email").fill("shopper@example.com");
  await page.getByLabel("Full name").fill("Test Shopper");
  await page.getByLabel("Address").fill("123 Test Street");
  await page.getByLabel("City").fill("Jakarta");
  await page.getByLabel("Postal code").fill("12345");
  // Country already defaults to "ID" — left as-is.

  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Thanks — your order is in." })).toBeVisible();
  await expect(page.getByText("Tenkeyless Mechanical Keyboard")).toBeVisible();
  // Appears twice at qty 1 (line price + total) — either is fine, just confirm it charged.
  await expect(page.getByText("$129.00").first()).toBeVisible();
});
