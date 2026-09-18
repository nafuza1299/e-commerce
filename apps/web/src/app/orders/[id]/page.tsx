import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreShell } from "@/components/store-shell";
import { NotFoundError, fetchOrder, formatPrice } from "@/lib/api";
import { Card, CardBody, CardHeader, LayoutContent, Tag } from "@/ui";

export const metadata: Metadata = { title: "Order confirmed · catalyst-commerce" };

type Params = Promise<{ id: string }>;

const STATUS_COLOR = { pending: "amber", paid: "green", shipped: "blue", cancelled: "red" } as const;

export default async function OrderPage({ params }: { params: Params }) {
  const { id } = await params;

  let order;
  try {
    order = await fetchOrder(id);
  } catch (error) {
    // A malformed id fails the API's uuid validation as a 400 rather than a 404;
    // to the visitor both are the same "no such order", so both land here.
    if (error instanceof NotFoundError) notFound();
    if (error instanceof Error && "status" in error && error.status === 400) notFound();
    throw error;
  }

  return (
    <StoreShell>
      <LayoutContent>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Thanks — your order is in.</h1>
            <p className="mt-1 text-sm text-text-muted">
              A confirmation would go to <span className="text-text">{order.email}</span> if this
              were a real store.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Order <code className="text-xs text-text-muted">{order.id}</code>
                </span>
                <Tag color={STATUS_COLOR[order.status]}>{order.status}</Tag>
              </div>
            </CardHeader>
            <CardBody>
              <ul className="divide-y divide-border text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {item.name} <span className="text-text-muted">× {item.quantity}</span>
                    </span>
                    {/* unitPriceCents is the price at the moment of purchase, stored
                        on the line — not a join back to a product that may since
                        have been repriced. */}
                    <span className="tabular-nums">
                      {formatPrice(item.unitPriceCents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
                <span>Total charged</span>
                <span className="tabular-nums">{formatPrice(order.totalCents)}</span>
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Placed {new Date(order.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
              </p>
            </CardBody>
          </Card>

          <p className="mt-6 text-sm">
            <Link href="/" className="text-primary hover:underline">
              Continue shopping
            </Link>
          </p>
        </div>
      </LayoutContent>
    </StoreShell>
  );
}
