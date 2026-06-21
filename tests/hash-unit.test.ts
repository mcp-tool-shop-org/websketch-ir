import { describe, it, expect } from "vitest";
import {
  quantizeBbox,
  hashNodeShallow,
  hashNodeDeep,
  bboxSimilarity,
  nodeSimilarity,
  generateNodeId,
  assignNodeIds,
  BBOX_QUANT_STEP,
} from "../src/index.js";
import { makeNode, makeText } from "./fixtures/index.js";

// =============================================================================
// quantizeBbox rounding
// =============================================================================

describe("quantizeBbox rounding", () => {
  it("rounds fractional values to nearest BBOX_QUANT_STEP", () => {
    // 0.1234 / 0.001 = 123.4 → rounds to 123 → 0.123
    const result = quantizeBbox([0.1234, 0.5678, 0.9995, 0.0004] as const);
    expect(result[0]).toBeCloseTo(0.123, 3);
    expect(result[1]).toBeCloseTo(0.568, 3);
    expect(result[2]).toBeCloseTo(1.0, 3);
    expect(result[3]).toBeCloseTo(0.0, 3);
  });

  it("rounds with custom step", () => {
    const result = quantizeBbox([0.123, 0.456, 0.789, 0.012] as const, 0.01);
    expect(result[0]).toBeCloseTo(0.12, 2);
    expect(result[1]).toBeCloseTo(0.46, 2);
    expect(result[2]).toBeCloseTo(0.79, 2);
    expect(result[3]).toBeCloseTo(0.01, 2);
  });

  it("handles exact multiples unchanged", () => {
    const result = quantizeBbox([0.1, 0.2, 0.3, 0.4] as const);
    expect(result[0]).toBeCloseTo(0.1, 3);
    expect(result[1]).toBeCloseTo(0.2, 3);
    expect(result[2]).toBeCloseTo(0.3, 3);
    expect(result[3]).toBeCloseTo(0.4, 3);
  });

  it("handles all zeros", () => {
    const result = quantizeBbox([0, 0, 0, 0] as const);
    expect(result).toEqual([0, 0, 0, 0]);
  });

  it("handles boundary values near 1.0", () => {
    const result = quantizeBbox([0.999, 0.999, 0.001, 0.001] as const);
    expect(result[0]).toBeCloseTo(0.999, 3);
    expect(result[1]).toBeCloseTo(0.999, 3);
    expect(result[2]).toBeCloseTo(0.001, 3);
    expect(result[3]).toBeCloseTo(0.001, 3);
  });
});

// =============================================================================
// hashNodeShallow determinism + option flags
// =============================================================================

describe("hashNodeShallow determinism and option flags", () => {
  it("is deterministic (same input → same output)", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, { interactive: true });
    expect(hashNodeShallow(node)).toBe(hashNodeShallow(node));
  });

  it("returns 16-char hex", () => {
    const node = makeNode("PAGE", [0, 0, 1, 1] as const);
    expect(hashNodeShallow(node)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("different roles → different hash", () => {
    const a = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    const b = makeNode("LINK", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("includeHandlers option affects hash when handlers present", () => {
    const node = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "submit" }],
    });
    const withHandlers = hashNodeShallow(node, { includeHandlers: true });
    const withoutHandlers = hashNodeShallow(node, { includeHandlers: false });
    expect(withHandlers).not.toBe(withoutHandlers);
  });

  it("includeBindings option affects hash when bindings present", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
      bindings: [{ property: "value", expression: "state.x" }],
    });
    const withBindings = hashNodeShallow(node, { includeBindings: true });
    const withoutBindings = hashNodeShallow(node, { includeBindings: false });
    expect(withBindings).not.toBe(withoutBindings);
  });

  it("includeState option affects hash when state present", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
      state: [{ key: "count", access: "read" }],
    });
    const withState = hashNodeShallow(node, { includeState: true });
    const withoutState = hashNodeShallow(node, { includeState: false });
    expect(withState).not.toBe(withoutState);
  });

  it("includeStyle option affects hash when style present", () => {
    const node = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      style: { tokens: ["primary", "elevated"] },
    });
    const withStyle = hashNodeShallow(node, { includeStyle: true });
    const withoutStyle = hashNodeShallow(node, { includeStyle: false });
    expect(withStyle).not.toBe(withoutStyle);
  });

  it("includePattern option affects hash when pattern present", () => {
    const node = makeNode("FORM", [0.1, 0.1, 0.8, 0.8] as const, {
      pattern: { kind: "auth_form", name: "login" },
    });
    const withPattern = hashNodeShallow(node, { includePattern: true });
    const withoutPattern = hashNodeShallow(node, { includePattern: false });
    expect(withPattern).not.toBe(withoutPattern);
  });

  it("semantic field affects hash", () => {
    const a = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      semantic: "submit",
    });
    const b = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      semantic: "cancel",
    });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("enabled flag affects hash", () => {
    const a = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      enabled: true,
    });
    const b = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      enabled: false,
    });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });
});

// =============================================================================
// hashNodeDeep child ordering
// =============================================================================

describe("hashNodeDeep child ordering", () => {
  it("children sorted by y-position for stable hash", () => {
    const childA = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    const childB = makeNode("INPUT", [0.1, 0.5, 0.2, 0.1] as const, { interactive: true });

    const orderAB = makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childA, childB] });
    const orderBA = makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childB, childA] });

    expect(hashNodeDeep(orderAB)).toBe(hashNodeDeep(orderBA));
  });

  it("children at same y sorted by x-position", () => {
    const childA = makeNode("BUTTON", [0.1, 0.5, 0.1, 0.1] as const, { interactive: true });
    const childB = makeNode("INPUT", [0.5, 0.5, 0.1, 0.1] as const, { interactive: true });

    const orderAB = makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childA, childB] });
    const orderBA = makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childB, childA] });

    expect(hashNodeDeep(orderAB)).toBe(hashNodeDeep(orderBA));
  });

  it("different children → different deep hash", () => {
    const treeA = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
    });
    const treeB = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [makeNode("INPUT", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
    });
    expect(hashNodeDeep(treeA)).not.toBe(hashNodeDeep(treeB));
  });

  it("leaf deep hash equals shallow hash", () => {
    const leaf = makeNode("TEXT", [0.5, 0.5, 0.2, 0.1] as const);
    expect(hashNodeDeep(leaf)).toBe(hashNodeShallow(leaf));
  });
});

// =============================================================================
// Minimal node (just role + bbox, no optional fields)
// =============================================================================

describe("minimal node hashing (role + bbox only)", () => {
  it("hashNodeShallow handles minimal node without optional fields", () => {
    const node = makeNode("SECTION", [0.1, 0.2, 0.3, 0.4] as const);
    const hash = hashNodeShallow(node);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    // Deterministic
    expect(hashNodeShallow(node)).toBe(hash);
  });

  it("hashNodeDeep handles minimal node without optional fields", () => {
    const node = makeNode("SECTION", [0.1, 0.2, 0.3, 0.4] as const);
    const hash = hashNodeDeep(node);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    // Leaf with no children: deep === shallow
    expect(hash).toBe(hashNodeShallow(node));
  });

  it("hashNodeDeep handles minimal tree (parent + minimal child)", () => {
    const parent = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [makeNode("SECTION", [0.1, 0.2, 0.3, 0.4] as const)],
    });
    const hash = hashNodeDeep(parent);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    // Parent deep hash differs from its shallow hash because of children
    expect(hash).not.toBe(hashNodeShallow(parent));
  });
});

// =============================================================================
// bboxSimilarity (identical/disjoint/overlap/zero-area)
// =============================================================================

describe("bboxSimilarity edge cases", () => {
  it("identical boxes → 1.0", () => {
    const bbox = [0.1, 0.2, 0.3, 0.4] as const;
    expect(bboxSimilarity(bbox, bbox)).toBeCloseTo(1.0, 10);
  });

  it("completely disjoint → 0.0", () => {
    const a = [0, 0, 0.1, 0.1] as const;
    const b = [0.5, 0.5, 0.1, 0.1] as const;
    expect(bboxSimilarity(a, b)).toBe(0);
  });

  it("50% overlap produces value between 0 and 1", () => {
    const a = [0, 0, 0.4, 0.4] as const;
    const b = [0.2, 0.2, 0.4, 0.4] as const;
    const sim = bboxSimilarity(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("identical zero-area boxes at the same point → 1.0", () => {
    expect(bboxSimilarity([0.5, 0.5, 0, 0] as const, [0.5, 0.5, 0, 0] as const)).toBe(1);
  });

  it("zero-area boxes at different points → 0.0", () => {
    expect(bboxSimilarity([0.5, 0.5, 0, 0] as const, [0.2, 0.2, 0, 0] as const)).toBe(0);
  });

  it("one zero-area box → 0.0", () => {
    expect(bboxSimilarity([0.1, 0.1, 0.5, 0.5] as const, [0.2, 0.2, 0, 0] as const)).toBe(0);
  });

  it("fully contained box has value < 1", () => {
    const outer = [0, 0, 1, 1] as const;
    const inner = [0.2, 0.2, 0.1, 0.1] as const;
    const sim = bboxSimilarity(outer, inner);
    expect(sim, "similarity of fully contained small box inside large box").toBeGreaterThan(0);
    expect(sim, "fully contained box should not equal 1.0 (area mismatch)").toBeLessThan(1);
  });
});

// =============================================================================
// nodeSimilarity scoring
// =============================================================================

describe("nodeSimilarity scoring", () => {
  it("identical nodes → score near 1.0", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      semantic: "submit",
      text: makeText("short", { hash: "abc", len: 5 }),
    });
    expect(
      nodeSimilarity(node, node),
      "similarity between identical BUTTON nodes"
    ).toBeGreaterThan(0.9);
  });

  it("same role, same position, different text → still high", () => {
    const a = makeNode("TEXT", [0.1, 0.1, 0.5, 0.1] as const, {
      text: makeText("short", { hash: "aaa", len: 5 }),
    });
    const b = makeNode("TEXT", [0.1, 0.1, 0.5, 0.1] as const, {
      text: makeText("short", { hash: "zzz", len: 5 }),
    });
    expect(
      nodeSimilarity(a, b),
      "similarity between TEXT nodes with same position but different text"
    ).toBeGreaterThan(0.6);
  });

  it("completely different nodes → low score", () => {
    const a = makeNode("BUTTON", [0, 0, 0.1, 0.1] as const, { interactive: true });
    const b = makeNode("TEXT", [0.8, 0.8, 0.1, 0.1] as const);
    expect(
      nodeSimilarity(a, b),
      "similarity between BUTTON and TEXT at opposite corners should be low"
    ).toBeLessThan(0.5);
  });

  it("same handlers boost similarity", () => {
    const handlersA = [{ event: "click" as const, intent: "submit" }];
    const a = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      handlers: handlersA,
    });
    const b = makeNode("BUTTON", [0.5, 0.5, 0.2, 0.1] as const, {
      interactive: true,
      handlers: handlersA,
    });
    const withoutHandlers = makeNode("BUTTON", [0.5, 0.5, 0.2, 0.1] as const, {
      interactive: true,
    });
    const simWithHandlers = nodeSimilarity(a, b);
    const simWithout = nodeSimilarity(a, withoutHandlers);
    expect(simWithHandlers).toBeGreaterThanOrEqual(simWithout);
  });

  it("matching pattern kind boosts similarity", () => {
    const a = makeNode("FORM", [0.1, 0.1, 0.8, 0.8] as const, {
      pattern: { kind: "auth_form", name: "login" },
    });
    const b = makeNode("FORM", [0.5, 0.5, 0.4, 0.4] as const, {
      pattern: { kind: "auth_form", name: "login" },
    });
    const c = makeNode("FORM", [0.5, 0.5, 0.4, 0.4] as const, {
      pattern: { kind: "search_bar" },
    });
    expect(nodeSimilarity(a, b)).toBeGreaterThan(nodeSimilarity(a, c));
  });
});

// =============================================================================
// generateNodeId stability
// =============================================================================

describe("generateNodeId stability", () => {
  it("same node → same ID", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, { interactive: true });
    expect(generateNodeId(node)).toBe(generateNodeId(node));
  });

  it("different nodes → different IDs", () => {
    const a = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    const b = makeNode("INPUT", [0.5, 0.5, 0.2, 0.1] as const, { interactive: true });
    expect(generateNodeId(a)).not.toBe(generateNodeId(b));
  });

  it("includes position hint in ID", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, { interactive: true });
    const id = generateNodeId(node);
    // Position hint is Math.round(bbox[0] * 100)_Math.round(bbox[1] * 100) → 10_20
    expect(id).toContain("10_20");
  });

  it("root path starts with /", () => {
    const node = makeNode("PAGE", [0, 0, 1, 1] as const);
    const id = generateNodeId(node);
    expect(id.startsWith("/")).toBe(true);
  });

  it("child path includes parent prefix", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, { interactive: true });
    const id = generateNodeId(node, "/parent123");
    expect(id.startsWith("/parent123/")).toBe(true);
  });
});

// =============================================================================
// assignNodeIds
// =============================================================================

describe("assignNodeIds", () => {
  it("assigns id to root node", () => {
    const node = makeNode("PAGE", [0, 0, 1, 1] as const);
    expect(node.id).toBe("");
    assignNodeIds(node);
    expect(node.id).toBeTruthy();
    expect(node.id.startsWith("/")).toBe(true);
  });

  it("assigns ids to all children recursively", () => {
    const node = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("SECTION", [0, 0, 1, 0.5] as const, {
          children: [makeNode("TEXT", [0.1, 0.1, 0.2, 0.1] as const)],
        }),
      ],
    });
    assignNodeIds(node);
    expect(node.id).toBeTruthy();
    expect(node.children![0].id).toBeTruthy();
    expect(node.children![0].children![0].id).toBeTruthy();
  });

  it("child ids include parent path", () => {
    const node = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
    });
    assignNodeIds(node);
    const childId = node.children![0].id;
    // Child ID should start with parent's ID
    expect(childId.startsWith(node.id + "/")).toBe(true);
  });

  it("is deterministic (same tree → same IDs)", () => {
    const makeTree = () => makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
    });
    const tree1 = makeTree();
    const tree2 = makeTree();
    assignNodeIds(tree1);
    assignNodeIds(tree2);
    expect(tree1.id).toBe(tree2.id);
    expect(tree1.children![0].id).toBe(tree2.children![0].id);
  });
});
