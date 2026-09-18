# catalyst-commerce — working notes

npm workspaces. `apps/web` (Next 16), `apps/api` (Fastify 5), `packages/shared`
(Drizzle tables + the Zod schemas derived from them). Node 24, npm 12, no pnpm.

## Commands

```bash
npm install              # root; resolves all three workspaces
npm run dev              # api on :3001 and web on :3000, via concurrently
npm run db:push          # drizzle-kit push, reads packages/shared/src/db/schema.ts
npm run db:seed          # deterministic catalog, 28 products
npm run typecheck        # tsc --noEmit in every workspace
npm run lint             # oxlint
npm test                 # vitest
```

`next build` must run from `apps/web`, not the repo root — from the root it finds no
`app` directory and fails.

## Invariants

**`packages/shared` is the only place the domain is written down.** A Drizzle table
becomes a Zod schema via drizzle-zod, and that same object is the API's request
validation, the OpenAPI document, the react-hook-form resolver and the client's types.
Breaking a schema must fail the API build *and* the web typecheck. If only one breaks,
something has been hand-copied and the reason this is a monorepo is gone.

**Money is integer cents, and the column and field names say `Cents`.** No floats, ever.
`formatPrice` in `apps/web/src/lib/api.ts` is the only place it becomes a display string.

**Checkout accepts product ids and quantities, never prices.** The server re-reads every
price from the database before totalling. A client-supplied price is the classic
"buy a laptop for one cent" bug; `checkoutInput` drops the field, and
`packages/shared/src/schemas/schemas.test.ts` asserts that it does.

**`apps/web/src/catalyst-ui/` is vendored and read-only.** It is a byte-identical copy of
catalyst-ui's `src/` minus `.test.tsx` and `.stories.tsx`. Fix bugs upstream and re-copy;
never edit in place. `git diff --no-index apps/web/src/catalyst-ui ../catalyst-ui/src`
should show only those deleted files. Brand overrides go in `app/globals.css`, and a
`:root` override there must be scoped `:root:not([data-theme="dark"])` — a bare `:root`
ties `[data-theme="dark"]` on specificity and wins in dark mode too.

**Import UI from `@/ui`, never from `src/catalyst-ui/` directly.** That file is the
single `"use client"` boundary for the whole library, which is what keeps the vendored
copy free of Next-specific directives.

**Use the flat sub-component names: `<CardHeader>`, not `<Card.Header>`.** catalyst-ui
attaches sub-components at runtime with `Object.assign`. A `"use client"` module reaches
a Server Component as a proxy over its *named exports* and the server never runs the
module, so `Card.Header` is `undefined` there and `<Card.Header>` produces an element
with no `type` — which crashes inside `Card` with a stack pointing at the library rather
than at the import. `@/ui` re-exports every sub-component under a flat name. Use those
everywhere, including in Client Components where the dotted form would also work, so
nothing depends on which side of the boundary a component sits on today.

## Theming across the SSR boundary

`[data-theme]` on `<html>` is the whole mechanism, exactly as in catalyst-ui. Three
pieces here honour it:

1. The blocking inline script in `app/layout.tsx`, which resolves the theme from
   `localStorage` (falling back to `prefers-color-scheme`) while the browser parses the
   HTML — before first paint, before React.
2. `ThemeProvider`, whose `getInitialTheme` reads the attribute *before* `localStorage`,
   so React's first render agrees with markup that is already on screen.
3. `<html data-theme="light">` as the server's default, corrected by (1) before anything
   paints.

The script goes through `components/inline-script.tsx`, which is `"use client"` on
purpose: it serves `type="text/javascript"` on the server (where the script does run,
during parsing) and `text/plain` on the client (where React would never execute an
injected script anyway). Rendered from a Server Component the swap could not happen and
React logs "Encountered a script tag while rendering React component" on every load.

**`ThemeToggleSlot` exists because `ThemeToggle` cannot be server-rendered.** It is the
only component whose markup depends on the theme, so the server's guess of "light"
mismatches for every dark-mode visitor. It is deferred to the client behind a Skeleton
sized `h-10 w-10 min-h-11 min-w-11` — Button `size="md" iconOnly` — so nothing shifts.
Don't render `ThemeToggle` directly.

## Gotchas that cost time

**`@types/node` is mandatory for drizzle-zod.** Its column mapping contains a
`TColumn['_']['data'] extends Buffer` branch. Without `@types/node`, `Buffer` resolves to
`any`, *everything* extends `any`, and every column collapses to `ZodType<Buffer>` — so
`.min()`, `.regex()` and friends vanish with errors that never mention Node types.

**esbuild postinstall scripts must be allow-listed.** npm 12 blocks them; esbuild uses
its postinstall to fetch a platform binary, so `tsx`, `vitest` and `drizzle-kit` all fail
without the `allowScripts` block in the root `package.json`.

**`npm audit` reports 4 moderate findings and they should stay.** They are
`drizzle-kit` → `@esbuild-kit/esm-loader` → esbuild ≤0.24.2, a dev-server advisory for a
dev-server this project never runs. `npm audit fix --force` downgrades drizzle-kit to
0.18.1, which predates drizzle-orm 0.45.

**postgres-js connects lazily**, which is why `apps/api/src/app.test.ts` can build the
app, exercise validation and read the OpenAPI document with no database. Keep those tests
on paths that return before a query runs.
