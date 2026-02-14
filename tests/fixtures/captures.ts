/**
 * Golden capture fixtures for WebSketch IR tests.
 *
 * These captures are deterministic (fixed timestamps, no randomness)
 * and cover the important structural patterns the library must handle.
 */

import { makeCapture, makeNode, makeText } from "./index.js";

// =============================================================================
// 1. minimal — Simplest valid capture (PAGE with no children)
// =============================================================================

export const minimal = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const)
);

// =============================================================================
// 2. singleButton — Leaf interactive node
// =============================================================================

export const singleButton = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      makeNode("BUTTON", [0.4, 0.45, 0.2, 0.1] as const, {
        interactive: true,
        enabled: true,
        semantic: "primary_cta",
        text: makeText("short", { hash: "abc123", len: 6 }),
      }),
    ],
  })
);

// =============================================================================
// 3. textNode — Text signal coverage (short, sentence, paragraph)
// =============================================================================

export const textNode = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      makeNode("TEXT", [0.1, 0.1, 0.8, 0.05] as const, {
        text: makeText("short", { hash: "hash_short", len: 8 }),
      }),
      makeNode("TEXT", [0.1, 0.2, 0.8, 0.1] as const, {
        text: makeText("sentence", { hash: "hash_sentence", len: 80 }),
      }),
      makeNode("TEXT", [0.1, 0.35, 0.8, 0.3] as const, {
        text: makeText("paragraph", { hash: "hash_paragraph", len: 500 }),
      }),
      makeNode("TEXT", [0.1, 0.7, 0.8, 0.05] as const, {
        text: makeText("none"),
      }),
    ],
  })
);

// =============================================================================
// 4. deepNesting — MAX_DEPTH boundary (8 levels)
// =============================================================================

function buildDeepTree(depth: number, maxDepth: number): ReturnType<typeof makeNode> {
  const roles = ["NAV", "SECTION", "CARD", "LIST", "FORM", "SECTION", "CARD", "TEXT"] as const;
  const role = roles[depth % roles.length];

  // Shrink bbox slightly at each level
  const inset = depth * 0.05;
  const size = 1 - inset * 2;

  const node = makeNode(role, [inset, inset, Math.max(0.1, size), Math.max(0.1, size)] as const);

  if (depth < maxDepth - 1) {
    node.children = [buildDeepTree(depth + 1, maxDepth)];
  }

  return node;
}

export const deepNesting = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [buildDeepTree(1, 8)],
  })
);

// =============================================================================
// 5. repeatedSiblings — Sibling ordering stability
// =============================================================================

export const repeatedSiblings = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      makeNode("LIST", [0, 0.1, 1, 0.8] as const, {
        children: [
          makeNode("CARD", [0.0, 0.1, 0.18, 0.3] as const, { semantic: "card_a" }),
          makeNode("CARD", [0.2, 0.1, 0.18, 0.3] as const, { semantic: "card_b" }),
          makeNode("CARD", [0.4, 0.1, 0.18, 0.3] as const, { semantic: "card_c" }),
          makeNode("CARD", [0.6, 0.1, 0.18, 0.3] as const, { semantic: "card_d" }),
          makeNode("CARD", [0.8, 0.1, 0.18, 0.3] as const, { semantic: "card_e" }),
        ],
      }),
    ],
  })
);

// =============================================================================
// 6. oddBounds — Edge-case bbox values
// =============================================================================

export const oddBounds = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      // Zero-area node
      makeNode("ICON", [0.5, 0.5, 0, 0] as const, { interactive: true }),
      // Full-viewport node
      makeNode("MODAL", [0, 0, 1, 1] as const, { z: 10 }),
      // Tiny node
      makeNode("BUTTON", [0.001, 0.001, 0.001, 0.001] as const, {
        interactive: true,
        semantic: "tiny",
      }),
      // Node at far edge
      makeNode("TOAST", [0.95, 0.0, 0.05, 0.05] as const, { z: 9 }),
    ],
  })
);

// =============================================================================
// 7. loginPage — Real-ish page structure
// =============================================================================

export const loginPage = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      makeNode("HEADER", [0, 0, 1, 0.08] as const, {
        children: [
          makeNode("NAV", [0.02, 0.01, 0.96, 0.06] as const, {
            semantic: "primary_nav",
            children: [
              makeNode("LINK", [0.02, 0.02, 0.08, 0.04] as const, {
                interactive: true,
                text: makeText("short", { hash: "nav_home", len: 4 }),
              }),
              makeNode("LINK", [0.12, 0.02, 0.08, 0.04] as const, {
                interactive: true,
                text: makeText("short", { hash: "nav_about", len: 5 }),
              }),
            ],
          }),
        ],
      }),
      makeNode("SECTION", [0.2, 0.15, 0.6, 0.65] as const, {
        semantic: "main_content",
        children: [
          makeNode("TEXT", [0.25, 0.18, 0.5, 0.05] as const, {
            text: makeText("short", { hash: "heading_login", len: 12 }),
          }),
          makeNode("FORM", [0.25, 0.25, 0.5, 0.45] as const, {
            semantic: "login",
            children: [
              makeNode("INPUT", [0.28, 0.3, 0.44, 0.06] as const, {
                interactive: true,
                enabled: true,
                semantic: "email",
                text: makeText("short", { hash: "placeholder_email", len: 13 }),
              }),
              makeNode("INPUT", [0.28, 0.4, 0.44, 0.06] as const, {
                interactive: true,
                enabled: true,
                semantic: "password",
                text: makeText("short", { hash: "placeholder_pw", len: 8 }),
              }),
              makeNode("BUTTON", [0.35, 0.52, 0.3, 0.08] as const, {
                interactive: true,
                enabled: true,
                semantic: "submit",
                text: makeText("short", { hash: "btn_signin", len: 7 }),
              }),
            ],
          }),
        ],
      }),
      makeNode("FOOTER", [0, 0.92, 1, 0.08] as const, {
        children: [
          makeNode("TEXT", [0.3, 0.94, 0.4, 0.04] as const, {
            text: makeText("short", { hash: "copyright", len: 18 }),
          }),
        ],
      }),
    ],
  }),
  { url: "https://example.com/login" }
);

// =============================================================================
// 8. loginPageModified — loginPage with changes for diff testing
// =============================================================================

export const loginPageModified = makeCapture(
  makeNode("PAGE", [0, 0, 1, 1] as const, {
    children: [
      // HEADER unchanged
      makeNode("HEADER", [0, 0, 1, 0.08] as const, {
        children: [
          makeNode("NAV", [0.02, 0.01, 0.96, 0.06] as const, {
            semantic: "primary_nav",
            children: [
              makeNode("LINK", [0.02, 0.02, 0.08, 0.04] as const, {
                interactive: true,
                text: makeText("short", { hash: "nav_home", len: 4 }),
              }),
              makeNode("LINK", [0.12, 0.02, 0.08, 0.04] as const, {
                interactive: true,
                text: makeText("short", { hash: "nav_about", len: 5 }),
              }),
            ],
          }),
        ],
      }),
      // SECTION: heading text changed, button moved
      makeNode("SECTION", [0.2, 0.15, 0.6, 0.65] as const, {
        semantic: "main_content",
        children: [
          makeNode("TEXT", [0.25, 0.18, 0.5, 0.05] as const, {
            text: makeText("short", { hash: "heading_welcome", len: 15 }), // text changed
          }),
          makeNode("FORM", [0.25, 0.25, 0.5, 0.45] as const, {
            semantic: "login",
            children: [
              makeNode("INPUT", [0.28, 0.3, 0.44, 0.06] as const, {
                interactive: true,
                enabled: true,
                semantic: "email",
                text: makeText("short", { hash: "placeholder_email", len: 13 }),
              }),
              makeNode("INPUT", [0.28, 0.4, 0.44, 0.06] as const, {
                interactive: true,
                enabled: true,
                semantic: "password",
                text: makeText("short", { hash: "placeholder_pw", len: 8 }),
              }),
              // Button moved down by 5%
              makeNode("BUTTON", [0.35, 0.57, 0.3, 0.08] as const, {
                interactive: true,
                enabled: true,
                semantic: "submit",
                text: makeText("short", { hash: "btn_signin", len: 7 }),
              }),
            ],
          }),
        ],
      }),
      // FOOTER unchanged
      makeNode("FOOTER", [0, 0.92, 1, 0.08] as const, {
        children: [
          makeNode("TEXT", [0.3, 0.94, 0.4, 0.04] as const, {
            text: makeText("short", { hash: "copyright", len: 18 }),
          }),
        ],
      }),
      // NEW: Toast notification added
      makeNode("TOAST", [0.7, 0.05, 0.25, 0.06] as const, {
        z: 9,
        text: makeText("sentence", { hash: "toast_msg", len: 45 }),
      }),
    ],
  }),
  { url: "https://example.com/login" }
);
