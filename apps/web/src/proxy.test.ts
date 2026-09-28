import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const run = (url: string) => proxy(new NextRequest(url));

describe("proxy", () => {
  it("serves the unfiltered / untouched", () => {
    expect(run("http://shop.test/").headers.get("location")).toBeNull();
  });

  it("redirects old /?… links to /browse, keeping the query", () => {
    const res = run("http://shop.test/?category=audio&sort=price-asc");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://shop.test/browse?category=audio&sort=price-asc");
  });

  // The router prefetches /browse's route tree without a query; redirecting it would
  // hand the router the tree for / instead.
  it("leaves /browse alone, with or without a query", () => {
    expect(run("http://shop.test/browse").headers.get("location")).toBeNull();
    expect(run("http://shop.test/browse?q=desk").headers.get("location")).toBeNull();
  });
});
