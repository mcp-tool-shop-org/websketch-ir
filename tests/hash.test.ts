import { describe, it, expect } from "vitest";
import {
  hashNodeShallow,
  hashNodeDeep,
  quantizeBbox,
  bboxToString,
  bboxSimilarity,
  nodeSimilarity,
  BBOX_QUANT_STEP,
} from "../src/index.js";
import { makeNode, makeText } from "./fixtures/index.js";

// =============================================================================
// hashNodeShallow
// =============================================================================

describe("hashNodeShallow", () => {
  it("returns same hash for same node (deterministic)", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, { interactive: true });
    const a = hashNodeShallow(node);
    const b = hashNodeShallow(node);
    expect(a).toBe(b);
  });

  it("returns different hash for different nodes", () => {
    const button = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, { interactive: true });
    const input = makeNode("INPUT", [0.5, 0.6, 0.2, 0.1] as const, { interactive: true });
    expect(hashNodeShallow(button)).not.toBe(hashNodeShallow(input));
  });

  it("returns 8-char hex string", () => {
    const node = makeNode("PAGE", [0, 0, 1, 1] as const);
    expect(hashNodeShallow(node)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("includeText: false ignores text hash", () => {
    const withText = makeNode("TEXT", [0, 0, 1, 0.1] as const, {
      text: makeText("short", { hash: "abc", len: 3 }),
    });
    const withDiffText = makeNode("TEXT", [0, 0, 1, 0.1] as const, {
      text: makeText("short", { hash: "xyz", len: 3 }),
    });

    // With text included (default), they differ
    expect(hashNodeShallow(withText)).not.toBe(hashNodeShallow(withDiffText));

    // With text excluded, they match
    expect(hashNodeShallow(withText, { includeText: false })).toBe(
      hashNodeShallow(withDiffText, { includeText: false })
    );
  });

  it("includeName: false ignores name hash", () => {
    const withName = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      name_hash: "name_a",
    });
    const withDiffName = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      name_hash: "name_b",
    });

    // With name included (default), they differ
    expect(hashNodeShallow(withName)).not.toBe(hashNodeShallow(withDiffName));

    // With name excluded, they match
    expect(hashNodeShallow(withName, { includeName: false })).toBe(
      hashNodeShallow(withDiffName, { includeName: false })
    );
  });

  it("includeZ: true includes z-index", () => {
    const z5 = makeNode("MODAL", [0, 0, 1, 1] as const, { z: 5 });
    const z10 = makeNode("MODAL", [0, 0, 1, 1] as const, { z: 10 });

    // Default (includeZ: false) — same hash
    expect(hashNodeShallow(z5)).toBe(hashNodeShallow(z10));

    // With includeZ: true — different hash
    expect(hashNodeShallow(z5, { includeZ: true })).not.toBe(
      hashNodeShallow(z10, { includeZ: true })
    );
  });
});

// =============================================================================
// hashNodeDeep
// =============================================================================

describe("hashNodeDeep", () => {
  it("returns same hash for same tree (deterministic)", () => {
    const tree = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true }),
        makeNode("INPUT", [0.1, 0.3, 0.2, 0.1] as const, { interactive: true }),
      ],
    });
    expect(hashNodeDeep(tree)).toBe(hashNodeDeep(tree));
  });

  it("children sorted by position, not input order", () => {
    const childA = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    const childB = makeNode("INPUT", [0.1, 0.3, 0.2, 0.1] as const, { interactive: true });

    const ordered = makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childA, childB] });
    const reversed = makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childB, childA] });

    expect(hashNodeDeep(ordered)).toBe(hashNodeDeep(reversed));
  });

  it("leaf node deep hash equals shallow hash", () => {
    const leaf = makeNode("BUTTON", [0.5, 0.5, 0.1, 0.05] as const, { interactive: true });
    expect(hashNodeDeep(leaf)).toBe(hashNodeShallow(leaf));
  });

  it("adding a child changes deep hash", () => {
    const noChildren = makeNode("PAGE", [0, 0, 1, 1] as const);
    const withChild = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
    });
    expect(hashNodeDeep(noChildren)).not.toBe(hashNodeDeep(withChild));
  });
});

// =============================================================================
// quantizeBbox
// =============================================================================

describe("quantizeBbox", () => {
  it("rounds values to BBOX_QUANT_STEP", () => {
    const result = quantizeBbox([0.1234, 0.5678, 0.3, 0.4] as const);
    expect(result[0]).toBeCloseTo(0.123, 3);
    expect(result[1]).toBeCloseTo(0.568, 3);
    expect(result[2]).toBeCloseTo(0.3, 3);
    expect(result[3]).toBeCloseTo(0.4, 3);
  });

  it("preserves exact multiples of BBOX_QUANT_STEP", () => {
    const result = quantizeBbox([0.1, 0.2, 0.3, 0.4] as const);
    expect(result[0]).toBeCloseTo(0.1, 3);
    expect(result[1]).toBeCloseTo(0.2, 3);
    expect(result[2]).toBeCloseTo(0.3, 3);
    expect(result[3]).toBeCloseTo(0.4, 3);
  });

  it("handles zero values", () => {
    const result = quantizeBbox([0, 0, 0, 0] as const);
    expect(result).toEqual([0, 0, 0, 0]);
  });
});

// =============================================================================
// bboxSimilarity
// =============================================================================

describe("bboxSimilarity", () => {
  it("identical boxes → 1.0", () => {
    const bbox = [0.1, 0.2, 0.3, 0.4] as const;
    expect(bboxSimilarity(bbox, bbox)).toBeCloseTo(1, 10);
  });

  it("no overlap → 0.0", () => {
    const a = [0, 0, 0.1, 0.1] as const;
    const b = [0.5, 0.5, 0.1, 0.1] as const;
    expect(bboxSimilarity(a, b)).toBe(0);
  });

  it("partial overlap → between 0 and 1", () => {
    const a = [0, 0, 0.5, 0.5] as const;
    const b = [0.25, 0.25, 0.5, 0.5] as const;
    const sim = bboxSimilarity(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("zero-area box → 0.0", () => {
    const a = [0.5, 0.5, 0, 0] as const;
    const b = [0.5, 0.5, 0, 0] as const;
    expect(bboxSimilarity(a, b)).toBe(0);
  });
});

// =============================================================================
// nodeSimilarity
// =============================================================================

describe("nodeSimilarity", () => {
  it("identical nodes → high score", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      semantic: "submit",
    });
    const sim = nodeSimilarity(node, node);
    expect(sim).toBeGreaterThan(0.8);
  });

  it("same role different position → medium score", () => {
    const a = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    const b = makeNode("BUTTON", [0.7, 0.8, 0.2, 0.1] as const, { interactive: true });
    const sim = nodeSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.3);
    expect(sim).toBeLessThan(0.9);
  });

  it("different role → low score", () => {
    const a = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    const b = makeNode("TEXT", [0.1, 0.1, 0.2, 0.1] as const);
    const sim = nodeSimilarity(a, b);
    expect(sim).toBeLessThan(0.7);
  });
});
