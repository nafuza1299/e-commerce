import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartHydration } from "@/components/cart-hydration";
import { InlineScript } from "@/components/inline-script";
import { ThemeProvider } from "@/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "catalyst-commerce",
  description:
    "A storefront and admin panel on Next.js and Fastify, sharing one set of Zod schemas.",
};

/*
  The server-rendered half of catalyst-ui's theming contract, and the reason
  ThemeProvider reads [data-theme] before it reads localStorage.

  This runs before the browser paints and before React hydrates, so the markup the
  server sent and the client's first render agree about the theme. Without it, a
  returning dark-mode visitor gets a white flash, and React reports a hydration
  mismatch the moment the provider's initial state disagrees with the DOM.

  Inline and blocking on purpose. next/script cannot do this job at any strategy:
  afterInteractive and lazyOnload both run after the first paint, which is the
  entire thing being avoided.

  catalyst-ui's own index.html carries the identical script. Keep the two in step.
*/
const themeScript = `(function(){try{var t=localStorage.getItem("design-system-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme="light" is the server's default; the script corrects it during
    // parsing, before anything paints. suppressHydrationWarning covers this
    // element's own attributes only, not its subtree — exactly the scope needed,
    // since the script is what changes them between render and hydration.
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <CartHydration />
      </body>
    </html>
  );
}
