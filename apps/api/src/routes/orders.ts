import { orderItems, orders, products } from "@repo/shared/db";
import { checkoutInput, errorDto, idParam, orderDto } from "@repo/shared/schemas";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { db } from "../db";
import { priceOrder } from "../pricing";

/** Thrown inside the transaction to roll it back when a concurrent order won a race. */
class StockRace extends Error {
  constructor(readonly productId: string) {
    super("stock changed during checkout");
  }
}

const toDto = (
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
) => ({
  id: order.id,
  status: order.status,
  totalCents: order.totalCents,
  email: order.email,
  createdAt: order.createdAt.toISOString(),
  items: items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
  })),
});

export const orderRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/orders",
    {
      // Writes get a tighter budget than the global limit. This is the endpoint a
      // script would hammer, and a real shopper places one order, not sixty.
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["orders"],
        summary: "Place an order",
        description:
          "Guest checkout. Prices are read from the catalog at the moment of purchase; the request carries only product ids and quantities.",
        body: checkoutInput,
        response: { 201: orderDto, 400: errorDto, 409: errorDto },
      },
    },
    async (request, reply) => {
      const body = request.body;

      const catalog = await db
        .select({
          id: products.id,
          name: products.name,
          priceCents: products.priceCents,
          stock: products.stock,
        })
        .from(products)
        .where(
          and(
            inArray(
              products.id,
              body.items.map((i) => i.productId),
            ),
            eq(products.status, "active"),
          ),
        );

      const priced = priceOrder(body.items, catalog);
      if (!priced.ok) {
        return reply.code(priced.error === "unknown_product" ? 400 : 409).send({
          error: priced.error,
          message:
            priced.error === "unknown_product"
              ? "One of the products is no longer available."
              : `Only ${priced.available} left of one of the products.`,
        });
      }

      try {
        const created = await db.transaction(async (tx) => {
          /*
            The stock check in priceOrder ran against a snapshot. Between then and
            here another order can have taken the last unit, so the decrement re-checks
            in the same statement: WHERE stock >= quantity. Zero rows updated means the
            snapshot is stale, and throwing rolls back the order and the lines above it.
            Checking stock and then decrementing it in two statements is the classic
            oversell.
          */
          for (const line of priced.lines) {
            const updated = await tx
              .update(products)
              .set({ stock: sql`${products.stock} - ${line.quantity}` })
              .where(and(eq(products.id, line.productId), gte(products.stock, line.quantity)))
              .returning({ id: products.id });
            if (updated.length === 0) throw new StockRace(line.productId);
          }

          const [order] = await tx
            .insert(orders)
            .values({
              // ponytail: payment is faked — status goes straight to "paid". The
              // real version inserts as "pending" and a Stripe webhook flips it,
              // which is also the strongest reason for this API to be its own service.
              status: "paid",
              totalCents: priced.totalCents,
              email: body.email,
              shippingName: body.shippingName,
              shippingLine1: body.shippingLine1,
              shippingCity: body.shippingCity,
              shippingPostalCode: body.shippingPostalCode,
              shippingCountry: body.shippingCountry,
            })
            .returning();

          const items = await tx
            .insert(orderItems)
            .values(priced.lines.map((line) => ({ ...line, orderId: order!.id })))
            .returning();

          return toDto(order!, items);
        });

        return reply.code(201).send(created);
      } catch (error) {
        if (error instanceof StockRace) {
          return reply.code(409).send({
            error: "insufficient_stock",
            message: "Someone else bought the last of one of these while you were checking out.",
          });
        }
        throw error;
      }
    },
  );

  app.get(
    "/orders/:id",
    {
      schema: {
        tags: ["orders"],
        summary: "Fetch an order by id",
        params: idParam,
        response: { 200: orderDto, 404: errorDto },
      },
    },
    async (request, reply) => {
      /*
        No session yet, so the order id is the capability: a v4 uuid is not guessable,
        which is how most stores handle guest order confirmation links. Once auth
        exists this also checks the order's userId against the session for signed-in
        orders, so a guest link keeps working and a member's history stays private.
      */
      const [order] = await db.select().from(orders).where(eq(orders.id, request.params.id));
      if (!order) return reply.code(404).send({ error: "not_found", message: "No such order." });

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return toDto(order, items);
    },
  );
};
