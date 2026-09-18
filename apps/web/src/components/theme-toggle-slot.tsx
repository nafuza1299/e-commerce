"use client";

import { useSyncExternalStore } from "react";
import { Skeleton, ThemeToggle } from "@/ui";

/** Never changes, so it never notifies — this store only reports where it runs. */
const neverChanges = () => () => {};

/*
  ThemeToggle is the only component in catalyst-ui whose *markup* depends on the
  theme: a sun or a moon, and an aria-label naming the mode you would switch to.
  The theme lives in localStorage, which a server cannot read, so SSR has to guess
  "light" — and React reports a hydration mismatch on that label for every visitor
  whose actual theme is dark.

  Everything else is fine, and for a reason worth stating: the rest of the library
  is themed by CSS driven off [data-theme], with no React state involved, so the
  server and client render byte-identical markup and only the paint differs. The
  inline script settles the paint before it happens. This one control is the single
  exception.

  So only this one is deferred to the client, behind a placeholder sized exactly
  like the button (Button size="md" iconOnly is h-10 w-10 min-h-11 min-w-11) so
  nothing shifts when it arrives.

  The other fix is a cookie, which the server *can* read — but that makes every
  route dynamic and needs ThemeProvider to accept a server-supplied initial value,
  which means changing the vendored library. Not worth it to server-render one
  button.
*/
export function ThemeToggleSlot() {
  // The third argument is the server snapshot, so this reads false during SSR and
  // true in the browser. Preferred over the useState-plus-useEffect version of the
  // same trick: no state update inside an effect, and no extra render pass.
  const mounted = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );

  if (!mounted) return <Skeleton shape="circle" className="h-10 w-10 min-h-11 min-w-11" />;
  return <ThemeToggle />;
}
