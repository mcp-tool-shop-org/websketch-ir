import { describe, it, expect } from "vitest";
import {
  hashSync,
  sha256Sync,
  fingerprintCapture,
} from "../src/index.js";
import { loginPage } from "./fixtures/captures.js";

// =============================================================================
// Hash test strategy:
// - Stability regression tests: inline snapshots pin known outputs so any
//   algorithm change (e.g. switching hash functions) is caught immediately.
// - Property-based tests: verify format (hex length), determinism (same input
//   → same output), and collision resistance (different inputs → different
//   hashes) without depending on specific hash values.
// =============================================================================

// =============================================================================
// hashSync basic behavior
// =============================================================================

describe("hashSync", () => {
  it("produces stable output", () => {
    expect(hashSync("hello")).toMatchInlineSnapshot(`"a430d84680aabd0b"`);
  });

  it("returns same result on repeated calls", () => {
    const a = hashSync("hello");
    const b = hashSync("hello");
    expect(a).toBe(b);
  });

  it("returns 16-char hex string (FNV-1a 64-bit)", () => {
    expect(hashSync("anything")).toMatch(/^[0-9a-f]{16}$/);
    expect(hashSync("")).toMatch(/^[0-9a-f]{16}$/);
    expect(hashSync("a very long input string with lots of characters")).toMatch(/^[0-9a-f]{16}$/);
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
    expect(sha256Sync("x")).toMatch(/^[0-9a-f]{16}$/);
  });
});

// =============================================================================
// Fingerprints unchanged after rename
// =============================================================================

describe("fingerprints unchanged after rename", () => {
  it("fingerprintCapture(loginPage) matches pre-rename snapshot", () => {
    // This must match the snapshot from commit 2 (fingerprint.test.ts)
    // If this breaks, the rename changed behavior.
    expect(fingerprintCapture(loginPage)).toMatchInlineSnapshot(`"3894a8dbfd7733a6"`);
  });
});
