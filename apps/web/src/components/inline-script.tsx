"use client";

/**
 * A script that runs while the browser parses the HTML, before the first paint.
 *
 * "use client" is load-bearing: the type swap below only means anything if this
 * component actually re-renders in the browser. Rendered from a Server Component
 * it would only ever run on the server, always emit text/javascript, and React
 * would still warn when it processed that element from the RSC payload.
 *
 * The type swap is what keeps React 19 quiet: rendering a <script> from a
 * component logs "Scripts inside React components are never executed when
 * rendering on the client", because on a client render React inserts the node via
 * the DOM and the browser will not execute it. Serving it as text/javascript on the
 * server (where it does execute, during parsing) and text/plain on the client
 * (where it never would anyway) says exactly that, instead of pretending otherwise.
 *
 * suppressHydrationWarning covers the resulting type mismatch. Pattern taken from
 * Next's own "Preventing flash before hydration" guide.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
