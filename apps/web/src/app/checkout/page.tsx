import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { StoreShell } from "@/components/store-shell";
import { LayoutContent } from "@/ui";

export const metadata: Metadata = { title: "Checkout · catalyst-commerce" };

export default function CheckoutPage() {
  return (
    <StoreShell>
      <LayoutContent>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
          <CheckoutForm />
        </div>
      </LayoutContent>
    </StoreShell>
  );
}
