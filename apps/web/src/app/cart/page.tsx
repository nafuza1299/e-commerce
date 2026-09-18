import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { StoreShell } from "@/components/store-shell";
import { LayoutContent } from "@/ui";

export const metadata: Metadata = { title: "Cart · catalyst-commerce" };

export default function CartPage() {
  return (
    <StoreShell>
      <LayoutContent>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-6 text-2xl font-semibold">Your cart</h1>
          <CartView />
        </div>
      </LayoutContent>
    </StoreShell>
  );
}
