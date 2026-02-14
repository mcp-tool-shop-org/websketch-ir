import { describe, it, expect } from "vitest";
import {
  hashSync,
  sha256Sync,
  fingerprintCapture,
} from "../src/index.js";
import { loginPage } from "./fixtures/captures.js";

// =============================================================================
// hashSync basic behavior
// =============================================================================

describe("hashSync", () => {
  it("produces stable output", () => {
    expect(hashSync("hello")).toMatchInlineSnapshot(`"0a9cede7"`);
  });

  it("returns same result on repeated calls", () => {
    const a = hashSync("hello");
    const b = hashSync("hello");
    expect(a).toBe(b);
  });

  it("returns 8-char hex string (djb2 format)", () => {
    expect(hashSync("anything")).toMatch(/^[0-9a-f]{8}$/);
    expect(hashSync("")).toMatch(/^[0-9a-f]{8}$/);
    expect(hashSync("a very long input string with lots of characters")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("different inputs produce different hashes", () => {
    expect(hashSync("a")).not.toBe(hashSync("b"));
    expect(hashSync("hello")).not.toBe(hashSync("world"));
    expect(hashSync("")).not.toBe(hashSync(" "));
  });
});

// =============================================================================
// sha256Sync backward compatibility
// =============================================================================

describe("sha256Sync backward compatibility", () => {
  it("sha256Sync is an alias for hashSync", () => {
    expect(sha256Sync("test")).toBe(hashSync("test"));
    expect(sha256Sync("hello world")).toBe(hashSync("hello world"));
    expect(sha256Sync("")).toBe(hashSync(""));
  });

  it("sha256Sync returns same format as hashSync", () => {
    expect(sha256Sync("x")).toMatch(/^[0-9a-f]{8}$/);
  });
});

// =============================================================================
// Fingerprints unchanged after rename
// =============================================================================

describe("fingerprints unchanged after rename", () => {
  it("fingerprintCapture(loginPage) matches pre-rename snapshot", () => {
    // This must match the snapshot from commit 2 (fingerprint.test.ts)
    // If this breaks, the rename changed behavior.
    expect(fingerprintCapture(loginPage)).toMatchInlineSnapshot(`"c29a74ed"`);
  });
});
