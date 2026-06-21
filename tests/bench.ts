/**
 * Performance benchmarks for WebSketch IR.
 *
 * Run with: npx vitest bench tests/bench.ts
 *
 * Benchmarks cover:
 * - diff() with 100, 500, 1000 nodes
 * - hashNodeDeep() on a realistic tree
 * - renderAscii() and emitHTML() on loginPage fixture
 * - flattenNodes() on a deep tree
 */

import { bench, describe } from "vitest";
import {
  diff,
  hashNodeDeep,
  renderAscii,
  emitHTML,
  flattenNodes,
  type UINode,
  type WebSketchCapture,
} from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { loginPage } from "./fixtures/captures.js";

// =============================================================================
// Helpers: generate trees of various sizes
// =============================================================================

const ROLES = ["SECTION", "CARD", "LIST", "TEXT", "BUTTON", "INPUT", "LINK", "FORM"] as const;

/**
 * Build a wide, shallow tree with N total leaf nodes.
 * Structure: PAGE -> N/10 SECTIONs, each with 10 children.
 */
function buildWideTree(nodeCount: number): UINode {
  const childrenPerSection = 10;
  const sectionCount = Math.max(1, Math.floor(nodeCount / childrenPerSection));

  const sections: UINode[] = [];
  for (let s = 0; s < sectionCount; s++) {
    const children: UINode[] = [];
    for (let c = 0; c < childrenPerSection; c++) {
      const idx = s * childrenPerSection + c;
      const role = ROLES[idx % ROLES.length];
      children.push(
        makeNode(role, [
          (c / childrenPerSection) * 0.9,
          (s / sectionCount) * 0.9 + 0.05,
          0.08,
          0.05,
        ] as const, {
          interactive: role === "BUTTON" || role === "INPUT" || role === "LINK",
          semantic: `item_${idx}`,
          text: makeText("short", { hash: `h${idx}`, len: 5 + (idx % 20) }),
        }),
      );
    }
    sections.push(
      makeNode("SECTION", [0, s / sectionCount, 1, 1 / sectionCount] as const, {
        semantic: `section_${s}`,
        children,
      }),
    );
  }

  return makeNode("PAGE", [0, 0, 1, 1] as const, { children: sections });
}

/**
 * Build a deep, narrow tree with N levels.
 */
function buildDeepTree(depth: number): UINode {
  let current = makeNode("TEXT", [0.4, 0.4, 0.2, 0.2] as const, {
    text: makeText("short", { hash: "leaf", len: 4 }),
  });
  for (let d = depth - 1; d > 0; d--) {
    const role = ROLES[d % ROLES.length];
    const inset = d * 0.02;
    current = makeNode(role, [inset, inset, 1 - inset * 2, 1 - inset * 2] as const, {
      children: [current],
    });
  }
  return makeNode("PAGE", [0, 0, 1, 1] as const, { children: [current] });
}

// Pre-build trees
const tree100 = buildWideTree(100);
const tree500 = buildWideTree(500);
const tree1000 = buildWideTree(1000);
const deepTree50 = buildDeepTree(50);

const capture100 = makeCapture(tree100);
const capture500 = makeCapture(tree500);
const capture1000 = makeCapture(tree1000);

// Modified captures (shift all children slightly for diff)
function shiftCapture(capture: WebSketchCapture): WebSketchCapture {
  function shiftNode(node: UINode): UINode {
    const shifted: UINode = {
      ...node,
      bbox: [
        node.bbox[0] + 0.001,
        node.bbox[1] + 0.001,
        node.bbox[2],
        node.bbox[3],
      ] as const,
    };
    if (node.children) {
      shifted.children = node.children.map(shiftNode);
    }
    return shifted;
  }
  return { ...capture, root: shiftNode(capture.root) };
}

const capture100b = shiftCapture(capture100);
const capture500b = shiftCapture(capture500);
const capture1000b = shiftCapture(capture1000);

// =============================================================================
// diff() benchmarks
// =============================================================================

describe("diff()", () => {
  bench("diff 100 nodes", () => {
    diff(capture100, capture100b);
  });

  bench("diff 500 nodes", () => {
    diff(capture500, capture500b);
  });

  bench("diff 1000 nodes", () => {
    diff(capture1000, capture1000b);
  });

  bench("diff identical (loginPage)", () => {
    diff(loginPage, loginPage);
  });
});

// =============================================================================
// hashNodeDeep() benchmarks
// =============================================================================

describe("hashNodeDeep()", () => {
  bench("hash loginPage root", () => {
    hashNodeDeep(loginPage.root);
  });

  bench("hash 100-node tree", () => {
    hashNodeDeep(tree100);
  });

  bench("hash 500-node tree", () => {
    hashNodeDeep(tree500);
  });

  bench("hash deep tree (50 levels)", () => {
    hashNodeDeep(deepTree50);
  });
});

// =============================================================================
// renderAscii() benchmarks
// =============================================================================

describe("renderAscii()", () => {
  bench("renderAscii loginPage", () => {
    renderAscii(loginPage);
  });

  bench("renderAscii 100-node capture", () => {
    renderAscii(capture100);
  });

  bench("renderAscii 500-node capture", () => {
    renderAscii(capture500);
  });
});

// =============================================================================
// emitHTML() benchmarks
// =============================================================================

describe("emitHTML()", () => {
  bench("emitHTML loginPage", () => {
    emitHTML(loginPage);
  });

  bench("emitHTML 100-node capture", () => {
    emitHTML(capture100);
  });

  bench("emitHTML 500-node capture", () => {
    emitHTML(capture500);
  });
});

// =============================================================================
// flattenNodes() benchmarks
// =============================================================================

describe("flattenNodes()", () => {
  bench("flattenNodes loginPage", () => {
    flattenNodes(loginPage.root);
  });

  bench("flattenNodes 100-node tree", () => {
    flattenNodes(tree100);
  });

  bench("flattenNodes 500-node tree", () => {
    flattenNodes(tree500);
  });

  bench("flattenNodes 1000-node tree", () => {
    flattenNodes(tree1000);
  });

  bench("flattenNodes deep tree (50 levels)", () => {
    flattenNodes(deepTree50);
  });
});
