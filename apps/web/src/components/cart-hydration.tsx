"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

/**
 * Reads the persisted cart from localStorage — once, after hydration. See the note in
 * store/cart.ts on why this cannot happen during render. Mounted once in the root
 * layout; renders nothing.
 */
export function CartHydration() {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  return null;
}
