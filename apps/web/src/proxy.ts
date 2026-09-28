import { NextResponse, type NextRequest } from "next/server";

// Filtered views moved from `/?…` to `/browse?…` so `/` could be prerendered; old links
// and bookmarks are redirected. A bare /browse is deliberately left alone: the client
// router prefetches a route's tree by pathname alone, and redirecting that request
// hands it the tree for `/` instead.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/" || !request.nextUrl.search) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/browse";
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: "/" };
