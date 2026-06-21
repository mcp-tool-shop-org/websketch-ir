/**
 * Stage B/C health-pass regression tests.
 *
 * Pins the non-finite robustness hardening + DX additions so they cannot
 * silently regress. Grouped by original finding id.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  hashNodeDeep,
  fingerprintCapture,
  renderAscii,
  renderForLLM,
  validateCapture,
  isValidCapture,
  getWebSketchError,
  parseCapture,
} from "../src/index.js";
import { LIBRARY_VERSION } from "../src/grammar.js";
import { renderMarkdown } from "../src/render/markdown.js";
import { makeCapture, makeNode } from "./fixtures/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// algorithms-001 (HIGH): deep hash is deterministic even with NaN bbox children
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: hashNodeDeep is order-independent with non-finite bbox", () => {
  it("produces the SAME deep hash regardless of source child order", () => {
    // childA has a NaN y-coordinate; childB is finite. Before the fix the
    // NaN comparator made sort order input-dependent → different hashes.
    const childA = () => makeNode("BUTTON", [0.1, NaN, 0.2, 0.1], { semantic: "a" });
    const childB = () => makeNode("INPUT", [0.1, 0.5, 0.2, 0.1], { semantic: "b" });
    const forward = makeNode("PAGE", [0, 0, 1, 1], { children: [childA(), childB()] });
    const reverse = makeNode("PAGE", [0, 0, 1, 1], { children: [childB(), childA()] });
    expect(hashNodeDeep(forward)).toBe(hashNodeDeep(reverse));
  });

  it("fingerprintCapture stays stable across child reordering with NaN bbox", () => {
    const a = () => makeNode("CARD", [NaN, 0.2, 0.3, 0.3], { semantic: "x" });
    const b = () => makeNode("CARD", [0.1, 0.4, 0.3, 0.3], { semantic: "y" });
    const fwd = makeCapture(makeNode("PAGE", [0, 0, 1, 1], { children: [a(), b()] }));
    const rev = makeCapture(makeNode("PAGE", [0, 0, 1, 1], { children: [b(), a()] }));
    expect(fingerprintCapture(fwd)).toBe(fingerprintCapture(rev));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// core-api-dx-001 (MEDIUM): validateCapture enforces the finite invariant
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: validateCapture rejects non-finite geometry", () => {
  it("flags a non-finite bbox element", () => {
    const issues = validateCapture(makeCapture(makeNode("PAGE", [0, NaN, 1, 1])));
    expect(issues.some((i) => i.path.includes("bbox") && /finite/.test(i.message))).toBe(true);
  });

  it("flags non-positive / non-finite viewport dimensions", () => {
    const cap = makeCapture(makeNode("PAGE", [0, 0, 1, 1]), {
      viewport: { w_px: 0, h_px: 0, aspect: Number.POSITIVE_INFINITY },
    });
    expect(validateCapture(cap).length).toBeGreaterThan(0);
  });

  it("still accepts a normal finite capture", () => {
    expect(validateCapture(makeCapture(makeNode("PAGE", [0, 0, 1, 1]))).length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// core-api-dx-002 / 005 (DX): isValidCapture + getWebSketchError
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: DX convenience helpers", () => {
  it("isValidCapture narrows a valid capture and rejects junk", () => {
    expect(isValidCapture(makeCapture(makeNode("PAGE", [0, 0, 1, 1])))).toBe(true);
    expect(isValidCapture({})).toBe(false);
    expect(isValidCapture(makeCapture(makeNode("PAGE", [0, NaN, 1, 1])))).toBe(false);
  });

  it("getWebSketchError extracts the structured payload, or undefined", () => {
    let caught: unknown;
    try {
      parseCapture("{ not valid json");
    } catch (e) {
      caught = e;
    }
    expect(getWebSketchError(caught)?.code).toBe("WS_INVALID_JSON");
    expect(getWebSketchError(new Error("plain"))).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// render-codegen-001/002/003 (MEDIUM/LOW): renderers fail soft on non-finite
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: renderers fail soft on non-finite input", () => {
  it("renderAscii does not throw on a NaN/Infinity bbox", () => {
    const cap = makeCapture(makeNode("PAGE", [NaN, Infinity, -Infinity, NaN]));
    expect(() => renderAscii(cap)).not.toThrow();
  });

  it("renderForLLM does not throw on a non-finite timestamp", () => {
    const cap = makeCapture(makeNode("PAGE", [0, 0, 1, 1]), { timestamp_ms: NaN });
    expect(() => renderForLLM(cap)).not.toThrow();
  });

  it("renderMarkdown(includeMetadata) does not throw on a non-finite timestamp", () => {
    const cap = makeCapture(makeNode("PAGE", [0, 0, 1, 1]), { timestamp_ms: Number.POSITIVE_INFINITY });
    expect(() => renderMarkdown(cap, { includeMetadata: true })).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// core-api-dx-006 (LOW): LIBRARY_VERSION must not drift from package.json
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: LIBRARY_VERSION matches package.json", () => {
  it("createCapture's stamped version tracks the published package version", () => {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), "utf-8")) as { version: string };
    expect(LIBRARY_VERSION).toBe(pkg.version);
  });
});
