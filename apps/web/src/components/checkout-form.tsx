"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import type { z } from "zod";
import { checkoutInput } from "@repo/shared/schemas";
import { ApiError, ApiUnavailableError, formatPrice, placeOrder } from "@/lib/api";
import { cartSubtotal, useCart } from "@/store/cart";
import { Button, Card, CardBody, CardHeader } from "@/ui";

/*
  The form's rules are the API's rules. `checkoutInput` is the schema Fastify
  validates the request body against; taking `items` off it (those come from the
  cart, not from fields) leaves exactly the shipping form, so a value that passes
  here cannot be rejected on the server for its shape — and when a rule changes in
  packages/shared, both sides move together.
*/
const formSchema = checkoutInput.omit({ items: true });
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

function Field({
  label,
  error,
  registration,
  ...rest
}: {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  const id = registration.name;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-10 w-full rounded-md border bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          error ? "border-danger" : "border-border"
        }`}
        {...registration}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: { shippingCountry: "ID" },
  });

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Nothing to check out.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-primary hover:underline">
          Browse the catalog
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: FormOutput) => {
    setServerError(null);
    try {
      const order = await placeOrder({
        ...values,
        // Ids and quantities only. Prices are deliberately not sent; see the note on
        // checkoutInput in packages/shared.
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      clear();
      router.push(`/orders/${order.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        // 409 is "the catalog changed under you" — a stock race or a product pulled
        // since it was added. The fix is in the cart, so say so.
        setServerError(
          error.status === 409 ? `${error.message} Please review your cart.` : error.message,
        );
      } else if (error instanceof ApiUnavailableError) {
        setServerError("The store is temporarily unreachable. Your cart has been kept.");
      } else {
        throw error;
      }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <CardHeader>Contact</CardHeader>
          <CardBody>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              registration={register("email")}
              error={errors.email}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Shipping address</CardHeader>
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Full name"
                  autoComplete="name"
                  registration={register("shippingName")}
                  error={errors.shippingName}
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Address"
                  autoComplete="address-line1"
                  registration={register("shippingLine1")}
                  error={errors.shippingLine1}
                />
              </div>
              <Field
                label="City"
                autoComplete="address-level2"
                registration={register("shippingCity")}
                error={errors.shippingCity}
              />
              <Field
                label="Postal code"
                autoComplete="postal-code"
                registration={register("shippingPostalCode")}
                error={errors.shippingPostalCode}
              />
              <Field
                label="Country (2-letter code)"
                autoComplete="country"
                maxLength={2}
                registration={register("shippingCountry")}
                error={errors.shippingCountry}
              />
            </div>
          </CardBody>
        </Card>

        {serverError ? (
          <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
          Place order
        </Button>
        <p className="text-xs text-text-muted">
          This is a demo. No payment is taken and nothing ships.
        </p>
      </form>

      <Card className="self-start">
        <CardHeader>Your order</CardHeader>
        <CardBody>
          <ul className="divide-y divide-border text-sm">
            {lines.map((line) => (
              <li key={line.productId} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {line.name} <span className="text-text-muted">× {line.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatPrice(line.priceCents * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(cartSubtotal(lines))}</span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            <Link href="/cart" className="text-primary hover:underline">
              Edit cart
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
