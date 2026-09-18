"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/api";
import { cartSubtotal, useCart } from "@/store/cart";
import { Button, Card, CardBody, CardFooter, CardHeader } from "@/ui";

export function CartView() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = cartSubtotal(lines);

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Your cart is empty.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-primary hover:underline">
          Browse the catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {lines.map((line) => (
          <li key={line.productId} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/p/${line.slug}`} className="font-medium hover:text-primary">
                {line.name}
              </Link>
              <p className="text-sm text-text-muted">{formatPrice(line.priceCents)} each</p>
            </div>

            <div className="flex items-center gap-1" role="group" aria-label={`Quantity of ${line.name}`}>
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                aria-label="Decrease quantity"
                onClick={() => setQuantity(line.productId, line.quantity - 1)}
              >
                −
              </Button>
              <span className="w-8 text-center tabular-nums" aria-live="polite">
                {line.quantity}
              </span>
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                aria-label="Increase quantity"
                disabled={line.quantity >= 99}
                onClick={() => setQuantity(line.productId, line.quantity + 1)}
              >
                +
              </Button>
            </div>

            <p className="w-24 text-right font-semibold tabular-nums">
              {formatPrice(line.priceCents * line.quantity)}
            </p>

            <Button variant="ghost" size="sm" onClick={() => remove(line.productId)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <Card className="self-start">
        <CardHeader>Order summary</CardHeader>
        <CardBody>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Subtotal</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Shipping</dt>
              <dd>Free</dd>
            </div>
          </dl>
          {/* The subtotal is drawn from prices the cart remembered. The server
              re-reads every price when the order is placed, so what is charged is
              whatever the catalog says then — never this number. */}
          <p className="mt-3 text-xs text-text-muted">Final price confirmed at checkout.</p>
        </CardBody>
        <CardFooter>
          <Button size="lg" className="w-full" onClick={() => router.push("/checkout")}>
            Proceed to checkout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
