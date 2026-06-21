/**
 * Tests for tree traversal utilities and builder/factory API.
 *
 * Covers: flattenNodes, walkNodes, filterNodes, createNode, createCapture
 */

import { describe, it, expect } from "vitest";
import {
  flattenNodes,
  walkNodes,
  filterNodes,
  createNode,
  createCapture,
  type UINode,
} from "../src/index.js";
import { makeNode, makeCapture, makeText } from "./fixtures/index.js";
import { loginPage, deepNesting, repeatedSiblings, minimal } from "./fixtures/captures.js";

// =============================================================================
// flattenNodes
// =============================================================================

describe("flattenNodes", () => {
  it("returns single-element array for leaf node", () => {
    const leaf = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const);
    const result = flattenNodes(leaf);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(leaf);
  });

  it("returns root first (DFS pre-order)", () => {
    const root = loginPage.root;
    const result = flattenNodes(root);
    expect(result[0]).toBe(root);
    expect(result[0].role).toBe("PAGE");
  });

  it("includes all nodes in the tree", () => {
    const child1 = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const);
    const child2 = makeNode("INPUT", [0.4, 0.1, 0.2, 0.1] as const);
    const parent = makeNode("FORM", [0.05, 0.05, 0.9, 0.9] as const, {
      children: [child1, child2],
    });
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [parent],
    });

    const result = flattenNodes(root);
    expect(result).toHaveLength(4);
    expect(result).toContain(root);
    expect(result).toContain(parent);
    expect(result).toContain(child1);
    expect(result).toContain(child2);
  });

  it("traverses children left-to-right", () => {
    const a = makeNode("BUTTON", [0.1, 0.1, 0.1, 0.1] as const, { semantic: "a" });
    const b = makeNode("BUTTON", [0.3, 0.1, 0.1, 0.1] as const, { semantic: "b" });
    const c = makeNode("BUTTON", [0.5, 0.1, 0.1, 0.1] as const, { semantic: "c" });
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [a, b, c],
    });

    const result = flattenNodes(root);
    const semantics = result.filter((n) => n.semantic).map((n) => n.semantic);
    expect(semantics).toEqual(["a", "b", "c"]);
  });

  it("handles deep nesting fixture", () => {
    const result = flattenNodes(deepNesting.root);
    expect(result.length).toBeGreaterThan(1);
    // Every returned element should be a UINode with a role
    for (const node of result) {
      expect(node.role).toBeDefined();
    }
  });

  it("handles repeated siblings fixture", () => {
    const result = flattenNodes(repeatedSiblings.root);
    const cards = result.filter((n) => n.role === "CARD");
    expect(cards).toHaveLength(5);
  });
});

// =============================================================================
// walkNodes
// =============================================================================

describe("walkNodes", () => {
  it("visits root at depth 0", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const);
    const visits: Array<{ role: string; depth: number }> = [];
    walkNodes(root, (node, depth) => {
      visits.push({ role: node.role, depth });
    });
    expect(visits).toEqual([{ role: "PAGE", depth: 0 }]);
  });

  it("reports correct depth for nested nodes", () => {
    const leaf = makeNode("BUTTON", [0.2, 0.2, 0.1, 0.1] as const);
    const mid = makeNode("FORM", [0.1, 0.1, 0.5, 0.5] as const, {
      children: [leaf],
    });
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [mid],
    });

    const depths: number[] = [];
    walkNodes(root, (_node, depth) => {
      depths.push(depth);
    });
    expect(depths).toEqual([0, 1, 2]);
  });

  it("visits all nodes in DFS pre-order", () => {
    const roles: string[] = [];
    walkNodes(loginPage.root, (node) => {
      roles.push(node.role);
    });
    // First should be PAGE
    expect(roles[0]).toBe("PAGE");
    // Should contain all roles from loginPage
    expect(roles).toContain("HEADER");
    expect(roles).toContain("NAV");
    expect(roles).toContain("FORM");
    expect(roles).toContain("BUTTON");
    expect(roles).toContain("FOOTER");
  });

  it("visits children left-to-right", () => {
    const a = makeNode("TEXT", [0.1, 0.1, 0.1, 0.1] as const, { semantic: "first" });
    const b = makeNode("TEXT", [0.3, 0.1, 0.1, 0.1] as const, { semantic: "second" });
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, { children: [a, b] });

    const semantics: string[] = [];
    walkNodes(root, (node) => {
      if (node.semantic) semantics.push(node.semantic);
    });
    expect(semantics).toEqual(["first", "second"]);
  });

  it("visit count matches flattenNodes count", () => {
    let count = 0;
    walkNodes(loginPage.root, () => { count++; });
    const flat = flattenNodes(loginPage.root);
    expect(count).toBe(flat.length);
  });
});

// =============================================================================
// filterNodes
// =============================================================================

describe("filterNodes", () => {
  it("returns empty array when no nodes match", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const);
    const result = filterNodes(root, (n) => n.role === "MODAL");
    expect(result).toHaveLength(0);
  });

  it("returns all nodes when predicate always true", () => {
    const flat = flattenNodes(loginPage.root);
    const filtered = filterNodes(loginPage.root, () => true);
    expect(filtered).toHaveLength(flat.length);
  });

  it("filters by role", () => {
    const buttons = filterNodes(loginPage.root, (n) => n.role === "BUTTON");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.role).toBe("BUTTON");
    }
  });

  it("filters interactive nodes", () => {
    const interactive = filterNodes(loginPage.root, (n) => n.interactive);
    expect(interactive.length).toBeGreaterThan(0);
    for (const node of interactive) {
      expect(node.interactive).toBe(true);
    }
  });

  it("filters by semantic", () => {
    const logins = filterNodes(loginPage.root, (n) => n.semantic === "login");
    expect(logins).toHaveLength(1);
    expect(logins[0].role).toBe("FORM");
  });

  it("filters nodes with text", () => {
    const withText = filterNodes(loginPage.root, (n) => n.text !== undefined && n.text.kind !== "none");
    expect(withText.length).toBeGreaterThan(0);
    for (const node of withText) {
      expect(node.text).toBeDefined();
      expect(node.text!.kind).not.toBe("none");
    }
  });

  it("returns results in DFS order", () => {
    const cards = filterNodes(repeatedSiblings.root, (n) => n.role === "CARD");
    const semantics = cards.map((n) => n.semantic);
    expect(semantics).toEqual(["card_a", "card_b", "card_c", "card_d", "card_e"]);
  });
});

// =============================================================================
// createNode
// =============================================================================

describe("createNode", () => {
  it("creates a node with required fields", () => {
    const node = createNode("BUTTON", [0.1, 0.2, 0.3, 0.04]);
    expect(node.role).toBe("BUTTON");
    expect(node.bbox).toEqual([0.1, 0.2, 0.3, 0.04]);
  });

  it("defaults visible to true", () => {
    const node = createNode("TEXT", [0, 0, 1, 1]);
    expect(node.visible).toBe(true);
  });

  it("defaults interactive to false", () => {
    const node = createNode("TEXT", [0, 0, 1, 1]);
    expect(node.interactive).toBe(false);
  });

  it("uses a deterministic empty placeholder id (finalized by assignNodeIds)", () => {
    const node = createNode("BUTTON", [0.1, 0.1, 0.2, 0.1]);
    expect(typeof node.id).toBe("string");
    expect(node.id).toBe("");
    // Deterministic: equal inputs produce equal output (no Math.random)
    expect(createNode("BUTTON", [0.1, 0.1, 0.2, 0.1]).id).toBe(node.id);
  });

  it("applies optional overrides", () => {
    const node = createNode("INPUT", [0.1, 0.1, 0.5, 0.05], {
      interactive: true,
      semantic: "email",
      enabled: true,
    });
    expect(node.interactive).toBe(true);
    expect(node.semantic).toBe("email");
    expect(node.enabled).toBe(true);
  });

  it("supports children in options", () => {
    const child = createNode("BUTTON", [0.2, 0.2, 0.1, 0.05]);
    const parent = createNode("FORM", [0.1, 0.1, 0.5, 0.5], {
      children: [child],
    });
    expect(parent.children).toHaveLength(1);
    expect(parent.children![0]).toBe(child);
  });

  it("respects an explicit id override", () => {
    const node = createNode("SECTION", [0, 0, 1, 1], { id: "custom-id" });
    expect(node.id).toBe("custom-id");
  });
});

// =============================================================================
// createCapture
// =============================================================================

describe("createCapture", () => {
  it("creates a valid capture with minimal args", () => {
    const root = createNode("PAGE", [0, 0, 1, 1]);
    const capture = createCapture(root);
    expect(capture.version).toBe("0.1");
    expect(capture.root).toBe(root);
    expect(capture.compiler.name).toBe("websketch-ir");
  });

  it("defaults url to about:blank", () => {
    const capture = createCapture(createNode("PAGE", [0, 0, 1, 1]));
    expect(capture.url).toBe("about:blank");
  });

  it("defaults viewport to 1280x800", () => {
    const capture = createCapture(createNode("PAGE", [0, 0, 1, 1]));
    expect(capture.viewport.w_px).toBe(1280);
    expect(capture.viewport.h_px).toBe(800);
  });

  it("computes aspect ratio from viewport dimensions", () => {
    const capture = createCapture(createNode("PAGE", [0, 0, 1, 1]));
    expect(capture.viewport.aspect).toBeCloseTo(1280 / 800, 5);
  });

  it("accepts url override", () => {
    const capture = createCapture(
      createNode("PAGE", [0, 0, 1, 1]),
      { url: "https://example.com/test" },
    );
    expect(capture.url).toBe("https://example.com/test");
  });

  it("accepts viewport override", () => {
    const capture = createCapture(
      createNode("PAGE", [0, 0, 1, 1]),
      { viewport: { w_px: 375, h_px: 812 } },
    );
    expect(capture.viewport.w_px).toBe(375);
    expect(capture.viewport.h_px).toBe(812);
  });

  it("accepts timestamp_ms override", () => {
    const capture = createCapture(
      createNode("PAGE", [0, 0, 1, 1]),
      { timestamp_ms: 1700000000000 },
    );
    expect(capture.timestamp_ms).toBe(1700000000000);
  });

  it("produces a capture that flattenNodes can traverse", () => {
    const btn = createNode("BUTTON", [0.1, 0.1, 0.2, 0.1], { interactive: true });
    const form = createNode("FORM", [0.05, 0.05, 0.9, 0.9], { children: [btn] });
    const root = createNode("PAGE", [0, 0, 1, 1], { children: [form] });
    const capture = createCapture(root);
    const nodes = flattenNodes(capture.root);
    expect(nodes).toHaveLength(3);
  });
});

// =============================================================================
// Integration: traversal + builder
// =============================================================================

describe("traversal + builder integration", () => {
  it("createNode trees are walkable", () => {
    const tree = createNode("PAGE", [0, 0, 1, 1], {
      children: [
        createNode("HEADER", [0, 0, 1, 0.1]),
        createNode("SECTION", [0, 0.1, 1, 0.8], {
          children: [
            createNode("CARD", [0.1, 0.2, 0.3, 0.3]),
            createNode("CARD", [0.5, 0.2, 0.3, 0.3]),
          ],
        }),
        createNode("FOOTER", [0, 0.9, 1, 0.1]),
      ],
    });

    const roles: string[] = [];
    walkNodes(tree, (n) => roles.push(n.role));
    expect(roles).toEqual(["PAGE", "HEADER", "SECTION", "CARD", "CARD", "FOOTER"]);
  });

  it("filterNodes on createNode tree finds interactive elements", () => {
    const tree = createNode("PAGE", [0, 0, 1, 1], {
      children: [
        createNode("BUTTON", [0.1, 0.1, 0.2, 0.1], { interactive: true }),
        createNode("TEXT", [0.1, 0.3, 0.8, 0.1]),
        createNode("INPUT", [0.1, 0.5, 0.5, 0.05], { interactive: true }),
      ],
    });

    const interactive = filterNodes(tree, (n) => n.interactive);
    expect(interactive).toHaveLength(2);
    expect(interactive.map((n) => n.role).sort()).toEqual(["BUTTON", "INPUT"]);
  });
});
