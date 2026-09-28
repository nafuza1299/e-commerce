import { describe, expect, it } from "vitest";
import { catalogHref, toggleValue, withCursor, withParam } from "./search-params";

describe("catalog hrefs", () => {
  it("keeps the unfiltered catalog on the prerendered /", () => {
    expect(catalogHref(new URLSearchParams())).toBe("/");
    expect(withParam({ sort: "price-asc" }, "sort", null)).toBe("/");
  });

  it("sends every filtered view to /browse", () => {
    expect(toggleValue({}, "category", "audio")).toBe("/browse?category=audio");
    expect(withParam({}, "sort", "price-desc")).toBe("/browse?sort=price-desc");
    expect(withCursor({}, "abc")).toBe("/browse?cursor=abc");
  });

  it("drops the cursor on a filter change but keeps it for the next page", () => {
    expect(withParam({ cursor: "abc" }, "sort", "newest")).toBe("/browse?sort=newest");
    expect(withCursor({ sort: "newest" }, "abc")).toBe("/browse?sort=newest&cursor=abc");
  });
});
