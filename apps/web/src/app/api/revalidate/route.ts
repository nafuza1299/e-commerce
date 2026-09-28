import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/*
  There is no admin/CMS write endpoint yet to call this automatically, so today
  the only caller is `npm run db:seed` (see apps/api/src/seed.ts) — it re-seeds
  the catalog, then hits this route so the ~60s ISR window on the catalog and
  product pages doesn't leave visitors looking at pre-seed data.

  { expire: 0 } rather than the 'max' stale-while-revalidate profile: this call
  is a webhook-style caller outside a Server Action, and the docs are explicit
  that `updateTag` (which would serve fresh content mid-request) isn't available
  there — { expire: 0 } is the immediate-invalidation option for that case.
*/
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ revalidated: false, message: "REVALIDATE_SECRET not set" }, { status: 501 });
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json({ revalidated: false, message: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("products", { expire: 0 });
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
