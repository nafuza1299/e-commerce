# catalyst-commerce

> Portfolio project by [nafuza1299](https://github.com/nafuza1299). Storefront and admin
> on Next.js 16 + Fastify 5, sharing one set of Zod schemas. Built on
> [catalyst-ui](https://github.com/nafuza1299/catalyst-ui) — its third consumer, and the
> first server-rendered one.

**Stack:** Next 16 (App Router, React 19) · Fastify 5 · Postgres via Drizzle · Zod 4 ·
Zustand 5 · Tailwind v4 · TanStack Query · oxlint · Vitest + Playwright.

## Status

Working end to end: the shared schema layer, the Fastify catalog API with generated
OpenAPI docs, and the Next shell with catalyst-ui vendored and rendering under SSR.

| | |
|---|---|
| ✅ `packages/shared` | Drizzle tables → drizzle-zod → validation, OpenAPI, form resolvers, client types |
| ✅ `apps/api` | Catalog reads with keyset pagination, `GET /categories`, `POST /orders` (guest checkout, server-side pricing, transactional stock), `GET /orders/:id`, `/docs`, seed |
| ✅ `apps/web` | Vendored catalyst-ui behind one `"use client"` boundary; themed, SSR-safe, no hydration warnings |
| ✅ Catalog | Retail shell — search, department nav, filter rail, sort, paginated grid |
| ✅ Storefront | Product detail, cart (Zustand + persist), checkout (react-hook-form + the shared schema), order confirmation |
| ⬜ Admin | Product CRUD, order table |
| ⬜ Auth | better-auth; orders attach to a user when signed in. Payment is deliberately faked (see below) |

## The point of it

Two things, and the second is the one worth reading.

### One definition, five consumers

```
Postgres column
  └─ Drizzle table          packages/shared/src/db/schema.ts
      └─ drizzle-zod        packages/shared/src/schemas/
          ├─ Fastify request validation
          ├─ OpenAPI document → /docs
          ├─ react-hook-form resolver
          └─ client types via z.infer
```

No codegen step and no build step — `@repo/shared` is raw TypeScript that both sides
compile. This only reads cleanly in one repository, which is the whole argument for the
monorepo: break a schema and *both* the API build and the web typecheck fail together.

The most interesting thing in that layer is what `checkoutInput` leaves out. The client
sends product ids and quantities and never a price; the server re-reads every price
before it totals anything. A test asserts a client-supplied price is dropped rather than
trusting that it is, and the pricing itself lives in a pure function
([`apps/api/src/pricing.ts`](apps/api/src/pricing.ts)) with no database in reach, so
the money path is tested in isolation — including the case where a cart lists the same
product twice and the stock check has to see the merged total.

The order insert then does the thing that separates a demo from a store: stock is
decremented with `WHERE stock >= quantity` in the same statement, inside a transaction,
so two shoppers racing for the last unit cannot both get it. Zero rows updated means
the snapshot was stale, the transaction rolls back, and the caller gets a 409.

That same `checkoutInput` — minus `items` — is the checkout form's resolver. The rules a
shopper sees are the rules the API enforces, because they are the same object.

### Taking a client-only component library server-side

catalyst-ui was built for Vite. Making it render under Next surfaced three problems that
no CSR consumer could have found, and the fixes are the interesting part:

- **`ThemeProvider` could not run on a server at all.** `getInitialTheme` called
  `localStorage` inside a `useState` initializer, so it executed during render and threw
  in Node. Fixed upstream rather than patched here, so the vendored copy stays identical
  to the library. It now reads `[data-theme]` *before* storage — which is what lets a
  blocking script in `<head>` settle the theme before first paint and still have React's
  first render agree with the markup. That same change removed a pre-existing white flash
  in catalyst-ui's own showcase, which had been hardcoding `data-theme="light"`.

- **Sub-components attached with `Object.assign` are invisible to a Server Component.**
  A `"use client"` module reaches the server as a proxy over its *named exports*, and the
  server never executes it — so `Card.Header` is `undefined` there, `<Card.Header>` builds
  an element with no `type`, and `Card` crashes reading `type.displayName` with a stack
  pointing into the library instead of at the import. `src/ui.ts` re-exports every
  sub-component under a flat name.

- **One component genuinely cannot be server-rendered.** `ThemeToggle` renders a sun or a
  moon and an `aria-label` naming the other mode. Everything else in the library is themed
  by CSS hanging off one attribute, so server and client emit identical markup; this one
  depends on state the server cannot know. It is deferred to the client behind a
  correctly-sized skeleton. Deferring *one button* is cheaper than moving the theme into a
  cookie, which would make every route dynamic and change the library's contract.

The vendored directory is byte-identical to upstream minus tests and stories:

```bash
git diff --no-index apps/web/src/catalyst-ui ../catalyst-ui/src
```

Anything else in that diff means the copy has drifted and the fix belongs upstream.

### Filters are the URL, not client state

The catalog uses the layout large retailers converged on — search bar, department strip,
left filter rail, sorted result grid — and almost none of it ships JavaScript. Every
department toggle and price band is a link to the same page with one parameter changed,
and search is a plain GET form, so filters survive a reload, are shareable, work with the
back button, and function with scripting off. Only the sort dropdown is a Client
Component, because a native `<select>` cannot navigate on its own.

Two details that are easy to get wrong and are handled in
[`lib/search-params.ts`](apps/web/src/lib/search-params.ts): every filter change drops the
`cursor` (a cursor points into one specific ordered, filtered result set, so carrying it
across a filter change silently starts from the wrong row), and a price band sets both
bounds in a single href rather than two, so a click can never land on a half-applied range.

The result count says "N results on this page" rather than a total, because keyset
pagination deliberately never runs a `COUNT` over the filtered set. Claiming a total
would mean inventing one.

## Running it

```bash
npm install
cp apps/api/.env.example apps/api/.env    # point DATABASE_URL at any Postgres
npm run db:push && npm run db:seed
npm run dev                               # api :3001, web :3000
```

`http://localhost:3001/docs` is the API, browsable. The web app renders a clear panel
instead of an empty grid when the API is not up.

```bash
npm run typecheck && npm run lint && npm test
```

## Deliberate limitations

- **Payment is faked.** Checkout will set `order.status = 'paid'` directly. A Stripe
  webhook into Fastify is the obvious next commit and the strongest single argument for
  the API being a separate service; until then that argument rests on the
  OpenAPI-from-Zod pipeline. Said plainly here rather than implied otherwise.
- **`npm audit` reports 4 moderate findings, and they stay.** All are
  `drizzle-kit` → `@esbuild-kit/esm-loader` → esbuild ≤0.24.2 — an advisory about
  esbuild's dev server, which drizzle-kit never starts. `npm audit fix --force` downgrades
  drizzle-kit to 0.18.1, which predates drizzle-orm 0.45.
- **No Turborepo.** Two apps; the caching would save seconds. It is one config file
  whenever builds start to hurt.
- **catalyst-ui is vendored, not installed.** Third copy, and the drift is real — this one
  needed flat sub-component exports that the others do not. That is the argument for
  publishing the library properly, recorded rather than hidden.
