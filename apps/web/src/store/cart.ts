import { create } from "zustand";
import { persist } from "zustand/middleware";

/*
  The cart is the one piece of state in this app that genuinely belongs to the
  client: it exists before there is an order, it has to survive a reload, and it is
  never authoritative — the server re-reads every price at checkout. That last point
  is why priceCents is stored here at all: to draw a subtotal, not to charge one.

  skipHydration is load-bearing. The persist middleware would otherwise read
  localStorage during the first client render, so the server's empty cart and the
  client's populated one would disagree on the very first paint and React would
  report a hydration mismatch on the badge count. Instead nothing is read until
  <CartHydration/> asks, after hydration. Same class of problem as the theme, solved
  the same way: the server renders a known default, the client corrects it once it
  is safe to.
*/

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

// Mirrors the API's per-line cap so the client never builds a cart it cannot submit.
const MAX_PER_LINE = 99;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      add: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === line.productId);
          if (!existing) return { lines: [...state.lines, { ...line, quantity }] };
          return {
            lines: state.lines.map((l) =>
              l.productId === line.productId
                ? { ...l, quantity: Math.min(MAX_PER_LINE, l.quantity + quantity) }
                : l,
            ),
          };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId
                    ? { ...l, quantity: Math.min(MAX_PER_LINE, quantity) }
                    : l,
                ),
        })),

      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

      clear: () => set({ lines: [] }),
    }),
    { name: "catalyst-commerce-cart", skipHydration: true },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
