/**
 * Tests for query / selector API.
 *
 * Covers: queryByRole, findFirst, findByRole
 */

import { describe, it, expect } from "vitest";
import {
  queryByRole,
  findFirst,
  findByRole,
  type UINode,
} from "../src/index.js";
import { makeNode } from "./fixtures/index.js";

// =============================================================================
// Helpers
// =============================================================================

/** Build a small tree with varied roles for query testing. */
function buildQueryTree(): UINode {
  return makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      makeNode("HEADER", [0, 0, 1, 0.1] as const, {
        semantic: "site-header",
        children: [
          makeNode("BUTTON", [0.8, 0.02, 0.1, 0.06] as const, {
            interactive: true,
            semantic: "menu-toggle",
          }),
          makeNode("LINK", [0.1, 0.02, 0.15, 0.06] as const, {
            semantic: "logo-link",
          }),
        ],
      }),
      makeNode("SECTION", [0, 0.1, 1, 0.7] as const, {
        children: [
          makeNode("FORM", [0.2, 0.2, 0.6, 0.4] as const, {
            children: [
              makeNode("INPUT", [0.25, 0.25, 0.5, 0.08] as const, {
                semantic: "email-field",
              }),
              makeNode("INPUT", [0.25, 0.35, 0.5, 0.08] as const, {
                semantic: "password-field",
              }),
              makeNode("BUTTON", [0.35, 0.5, 0.3, 0.08] as const, {
                interactive: true,
                semantic: "submit-btn",
              }),
            ],
          }),
        ],
      }),
      makeNode("FOOTER", [0, 0.9, 1, 0.1] as const, {
        children: [
          makeNode("LINK", [0.3, 0.92, 0.15, 0.05] as const, {
            semantic: "privacy-link",
          }),
          makeNode("LINK", [0.55, 0.92, 0.15, 0.05] as const, {
            semantic: "terms-link",
          }),
        ],
      }),
    ],
  });
}

/** Build a deeply nested tree (5 levels). */
function buildNestedTree(): UINode {
  return makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      makeNode("SECTION", [0, 0, 1, 1] as const, {
        children: [
          makeNode("CARD", [0.1, 0.1, 0.8, 0.8] as const, {
            children: [
              makeNode("LIST", [0.15, 0.15, 0.7, 0.5] as const, {
                children: [
                  makeNode("BUTTON", [0.2, 0.2, 0.2, 0.08] as const, {
                    interactive: true,
                    semantic: "deep-button",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// =============================================================================
// queryByRole
// =============================================================================

describe("queryByRole", () => {
  it("returns all buttons in a tree", () => {
    const root = buildQueryTree();
    const buttons = queryByRole(root, "BUTTON");
    expect(buttons).toHaveLength(2);
    expect(buttons.every((n) => n.role === "BUTTON")).toBe(true);
  });

  it("returns empty array when no matches", () => {
    const root = buildQueryTree();
    const modals = queryByRole(root, "MODAL");
    expect(modals).toEqual([]);
  });

  it("returns all inputs in a form tree", () => {
    const root = buildQueryTree();
    const inputs = queryByRole(root, "INPUT");
    expect(inputs).toHaveLength(2);
    expect(inputs[0].semantic).toBe("email-field");
    expect(inputs[1].semantic).toBe("password-field");
  });

  it("returns all links across the tree", () => {
    const root = buildQueryTree();
    const links = queryByRole(root, "LINK");
    expect(links).toHaveLength(3);
  });

  it("finds deeply nested buttons", () => {
    const root = buildNestedTree();
    const buttons = queryByRole(root, "BUTTON");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].semantic).toBe("deep-button");
  });

  it("returns single-element array for root role match", () => {
    const root = buildQueryTree();
    const pages = queryByRole(root, "PAGE");
    expect(pages).toHaveLength(1);
    expect(pages[0]).toBe(root);
  });
});

// =============================================================================
// findFirst
// =============================================================================

describe("findFirst", () => {
  it("returns the first matching node", () => {
    const root = buildQueryTree();
    const first = findFirst(root, (n) => n.role === "BUTTON");
    expect(first).toBeDefined();
    expect(first!.semantic).toBe("menu-toggle");
  });

  it("returns undefined when no match", () => {
    const root = buildQueryTree();
    const result = findFirst(root, (n) => n.role === "MODAL");
    expect(result).toBeUndefined();
  });

  it("can match on arbitrary predicates", () => {
    const root = buildQueryTree();
    const result = findFirst(root, (n) => n.semantic === "password-field");
    expect(result).toBeDefined();
    expect(result!.role).toBe("INPUT");
  });

  it("returns root when root matches", () => {
    const root = buildQueryTree();
    const result = findFirst(root, (n) => n.role === "PAGE");
    expect(result).toBe(root);
  });

  it("finds node in deeply nested tree", () => {
    const root = buildNestedTree();
    const result = findFirst(root, (n) => n.role === "BUTTON");
    expect(result).toBeDefined();
    expect(result!.semantic).toBe("deep-button");
  });

  it("returns undefined for leaf with no match", () => {
    const leaf = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const);
    const result = findFirst(leaf, (n) => n.role === "INPUT");
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// findByRole
// =============================================================================

describe("findByRole", () => {
  it("returns the first INPUT node", () => {
    const root = buildQueryTree();
    const result = findByRole(root, "INPUT");
    expect(result).toBeDefined();
    expect(result!.role).toBe("INPUT");
    expect(result!.semantic).toBe("email-field");
  });

  it("returns undefined when role not present", () => {
    const root = buildQueryTree();
    const result = findByRole(root, "TABLE");
    expect(result).toBeUndefined();
  });

  it("finds first BUTTON (DFS order)", () => {
    const root = buildQueryTree();
    const result = findByRole(root, "BUTTON");
    expect(result).toBeDefined();
    expect(result!.semantic).toBe("menu-toggle");
  });

  it("finds role in nested tree", () => {
    const root = buildNestedTree();
    const result = findByRole(root, "LIST");
    expect(result).toBeDefined();
    expect(result!.role).toBe("LIST");
  });
});
