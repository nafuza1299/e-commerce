import { NextResponse, type NextRequest } from "next/server";

// Filtered views moved from `/?…` to `/browse?…` so `/` could be prerendered. Old links
// and bookmarks are redirected, and a bare /browse goes to the one unfiltered page.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  if (pathname === "/" && search) url.pathname = "/browse";
  else if (pathname === "/browse" && !search) url.pathname = "/";
  else return NextResponse.next();
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: ["/", "/browse"] };
