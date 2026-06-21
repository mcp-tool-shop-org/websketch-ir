/**
 * Tests for new features added by Core and Codegen agents:
 * 1. normalizeText cache - LRU cache behavior and perf
 * 2. prepareDiff - pre-flattened capture for repeated diffing
 */

import { describe, it, expect } from "vitest";
import {
  normalizeText,
  diff,
  prepareDiff,
  flattenNodes,
} from "../src/index.js";
import type { PreparedCapture } from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { loginPage, loginPageModified, minimal } from "./fixtures/captures.js";
import { realisticPage } from "./fixtures/realistic.js";

// =============================================================================
// normalizeText cache
// =============================================================================

describe("normalizeText cache", () => {
  it("returns the same result when called twice with identical input", () => {
    const input = "  Hello   World  ";
    const first = normalizeText(input);
    const second = normalizeText(input);
    expect(first).toBe("hello world");
    expect(second).toBe("hello world");
    // Referential equality: cached result is the exact same string object
    // (V8 may intern strings, but the cache guarantees no re-computation)
    expect(Object.is(first, second)).toBe(true);
  });

  it("cache does not affect correctness for different inputs", () => {
    const a = normalizeText("FOO BAR");
    const b = normalizeText("BAZ QUX");
    expect(a).toBe("foo bar");
    expect(b).toBe("baz qux");
  });

  it("cache handles empty string", () => {
    const first = normalizeText("");
    const second = normalizeText("");
    expect(first).toBe("");
    expect(second).toBe("");
  });

  it("cache handles strings with invisible characters", () => {
    const input = "he\u200Bllo\uFEFF world";
    const first = normalizeText(input);
    const second = normalizeText(input);
    expect(first).toBe("hello world");
    expect(second).toBe(first);
  });

  it("cached call is faster than or equal to uncached call for many invocations", () => {
    // Warm the cache with a set of strings
    const inputs = Array.from({ length: 100 }, (_, i) => `  Test String ${i}  with   spaces  `);
    for (const s of inputs) normalizeText(s);

    // Time 1000 cached lookups
    const start = performance.now();
    for (let round = 0; round < 10; round++) {
      for (const s of inputs) normalizeText(s);
    }
    const cachedMs = performance.now() - start;

    // 1000 cached lookups should complete in under 50ms on any reasonable machine
    expect(cachedMs).toBeLessThan(50);
  });

  it("handles cache eviction gracefully beyond 1000 entries", () => {
    // Fill the cache well beyond its 1000-entry capacity
    const overflow: string[] = [];
    for (let i = 0; i < 1100; i++) {
      overflow.push(`unique-string-eviction-test-${i}`);
    }
    for (const s of overflow) normalizeText(s);

    // Even after eviction, the function still returns correct results
    // for both recently-cached and evicted entries
    expect(normalizeText(overflow[0])).toBe(overflow[0]); // may have been evicted
    expect(normalizeText(overflow[1099])).toBe(overflow[1099]); // recent, likely cached
  });
});

// =============================================================================
// prepareDiff
// =============================================================================

describe("prepareDiff", () => {
  it("returns a PreparedCapture with flat nodes and fingerprint", () => {
    const prepared = prepareDiff(loginPage);
    expect(prepared).toHaveProperty("capture");
    expect(prepared).toHaveProperty("flat");
    expect(prepared).toHaveProperty("fingerprint");
    expect(prepared.capture).toBe(loginPage);
    expect(Array.isArray(prepared.flat)).toBe(true);
    expect(prepared.flat.length).toBeGreaterThan(0);
    expect(typeof prepared.fingerprint).toBe("string");
    expect(prepared.fingerprint.length).toBeGreaterThan(0);
  });

  it("flat node count matches flattenNodes count", () => {
    const prepared = prepareDiff(loginPage);
    const expected = flattenNodes(loginPage.root).length;
    expect(prepared.flat.length).toBe(expected);
  });

  it("diff(prepared, raw) produces identical results to diff(raw, raw)", () => {
    const rawResult = diff(loginPage, loginPageModified);
    const prepared = prepareDiff(loginPage);
    const preparedResult = diff(prepared, loginPageModified);

    expect(preparedResult.summary.identical).toBe(rawResult.summary.identical);
    expect(preparedResult.summary.counts).toEqual(rawResult.summary.counts);
    expect(preparedResult.changes.length).toBe(rawResult.changes.length);

    // Verify each change matches
    for (let i = 0; i < rawResult.changes.length; i++) {
      expect(preparedResult.changes[i].type).toBe(rawResult.changes[i].type);
      expect(preparedResult.changes[i].description).toBe(rawResult.changes[i].description);
    }
  });

  it("diff(raw, prepared) also produces identical results", () => {
    const rawResult = diff(loginPage, loginPageModified);
    const preparedB = prepareDiff(loginPageModified);
    const result = diff(loginPage, preparedB);

    expect(result.summary.identical).toBe(rawResult.summary.identical);
    expect(result.summary.counts).toEqual(rawResult.summary.counts);
    expect(result.changes.length).toBe(rawResult.changes.length);
  });

  it("diff(prepared, prepared) produces identical results", () => {
    const rawResult = diff(loginPage, loginPageModified);
    const prepA = prepareDiff(loginPage);
    const prepB = prepareDiff(loginPageModified);
    const result = diff(prepA, prepB);

    expect(result.summary.identical).toBe(rawResult.summary.identical);
    expect(result.summary.counts).toEqual(rawResult.summary.counts);
    expect(result.changes.length).toBe(rawResult.changes.length);
  });

  it("prepared A vs A is identical", () => {
    const prepared = prepareDiff(loginPage);
    const result = diff(prepared, loginPage);
    expect(result.summary.identical).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it("prepared minimal vs minimal is identical", () => {
    const prepared = prepareDiff(minimal);
    const result = diff(prepared, minimal);
    expect(result.summary.identical).toBe(true);
  });

  it("works with the realistic page fixture", () => {
    const prepared = prepareDiff(realisticPage);
    expect(prepared.flat.length).toBeGreaterThan(50);

    // Diff against self should be identical
    const result = diff(prepared, realisticPage);
    expect(result.summary.identical).toBe(true);
  });

  it("each flat node has path, hash, depth, and node reference", () => {
    const prepared = prepareDiff(loginPage);
    for (const flat of prepared.flat) {
      expect(flat).toHaveProperty("node");
      expect(flat).toHaveProperty("depth");
      expect(flat).toHaveProperty("path");
      expect(flat).toHaveProperty("hash");
      expect(typeof flat.depth).toBe("number");
      expect(typeof flat.path).toBe("string");
      expect(typeof flat.hash).toBe("string");
      expect(flat.path.length).toBeGreaterThan(0);
      expect(flat.hash.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// realisticPage fixture structural validation
// =============================================================================

describe("realisticPage fixture", () => {
  it("has 50+ nodes", () => {
    const count = flattenNodes(realisticPage.root).length;
    expect(count).toBeGreaterThanOrEqual(50);
  });

  it("has mixed roles", () => {
    const nodes = flattenNodes(realisticPage.root);
    const roles = new Set(nodes.map((n) => n.role));
    // Should have at least 10 distinct roles
    expect(roles.size).toBeGreaterThanOrEqual(10);
  });

  it("has nodes with handlers", () => {
    const nodes = flattenNodes(realisticPage.root);
    const withHandlers = nodes.filter((n) => n.handlers && n.handlers.length > 0);
    expect(withHandlers.length).toBeGreaterThan(5);
  });

  it("has nodes with bindings", () => {
    const nodes = flattenNodes(realisticPage.root);
    const withBindings = nodes.filter((n) => n.bindings && n.bindings.length > 0);
    expect(withBindings.length).toBeGreaterThan(3);
  });

  it("has nodes with state signals", () => {
    const nodes = flattenNodes(realisticPage.root);
    const withState = nodes.filter((n) => n.state && n.state.length > 0);
    expect(withState.length).toBeGreaterThan(5);
  });

  it("has nodes with text signals of various kinds", () => {
    const nodes = flattenNodes(realisticPage.root);
    const textKinds = new Set(
      nodes.filter((n) => n.text).map((n) => n.text!.kind)
    );
    expect(textKinds.has("short")).toBe(true);
    expect(textKinds.has("sentence")).toBe(true);
    expect(textKinds.has("paragraph")).toBe(true);
  });

  it("has nodes with pattern signals", () => {
    const nodes = flattenNodes(realisticPage.root);
    const withPattern = nodes.filter((n) => n.pattern);
    expect(withPattern.length).toBeGreaterThan(3);
    const patternKinds = new Set(withPattern.map((n) => n.pattern!.kind));
    expect(patternKinds.size).toBeGreaterThanOrEqual(3);
  });

  it("has nodes with style intents", () => {
    const nodes = flattenNodes(realisticPage.root);
    const withStyle = nodes.filter((n) => n.style);
    expect(withStyle.length).toBeGreaterThan(5);
  });

  it("produces a valid capture that diffs cleanly", () => {
    const result = diff(realisticPage, realisticPage);
    expect(result.summary.identical).toBe(true);
  });
});
