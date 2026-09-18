import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("cursor", () => {
  it("round-trips a timestamp cursor", () => {
    const iso = "2026-09-06T10:11:12.345Z";
    const id = "3f7c1b52-5f8a-4a2e-9b3e-2f9d1c8a7b60";
    expect(decodeCursor(encodeCursor(iso, id))).toEqual({ sortValue: iso, id });
  });

  it("round-trips a numeric cursor", () => {
    expect(decodeCursor(encodeCursor("9900", "abc"))).toEqual({ sortValue: "9900", id: "abc" });
  });

  it("survives a sort value containing spaces and punctuation", () => {
    // The separator is a null byte precisely so a future name-ordered cursor
    // cannot collide with it.
    const name = "27-inch 4K IPS Display";
    expect(decodeCursor(encodeCursor(name, "x"))?.sortValue).toBe(name);
  });

  it("is opaque rather than readable", () => {
    expect(encodeCursor("9900", "abc")).not.toContain("9900");
  });

  // Cursors arrive from the query string, so every one of these is reachable by
  // anyone typing in the address bar. None may throw.
  it("returns null for malformed input instead of throwing", () => {
    for (const bad of ["", "not-base64!!", "Zm9v", btoa("only-one-part"), "%%%"]) {
      expect(decodeCursor(bad)).toBeNull();
    }
  });
});
