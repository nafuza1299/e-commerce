"use client";

import { useRouter } from "next/navigation";
import { cartCount, useCart } from "@/store/cart";
import { Button } from "@/ui";

const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
  </svg>
);

export function CartButton() {
  const router = useRouter();
  const count = useCart((s) => cartCount(s.lines));

  return (
    <Button
      variant="ghost"
      iconOnly
      aria-label={count === 0 ? "Cart, empty" : `Cart, ${count} ${count === 1 ? "item" : "items"}`}
      onClick={() => router.push("/cart")}
      className="relative"
    >
      <CartIcon />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-fg"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Button>
  );
}
