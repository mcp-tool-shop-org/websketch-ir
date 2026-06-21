/**
 * Tests for the JSON renderer (renderJSON).
 *
 * renderJSON produces minimal JSON trees for LLM tool-calling consumption.
 * It strips internal fields and keeps only what an LLM needs.
 */

import { describe, it, expect } from "vitest";
import { renderJSON } from "../src/render/json.js";
import type { RenderJSONOptions } from "../src/render/json.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { loginPage, minimal, singleButton, deepNesting } from "./fixtures/captures.js";

// =============================================================================
// Basic output
// =============================================================================

describe("renderJSON basics", () => {
  it("returns valid JSON string", () => {
    const json = renderJSON(minimal);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("root node has role PAGE", () => {
    const parsed = JSON.parse(renderJSON(minimal));
    expect(parsed.role).toBe("PAGE");
  });

  it("root node has bbox", () => {
    const parsed = JSON.parse(renderJSON(minimal));
    expect(parsed.bbox).toEqual([0, 0, 1, 1]);
  });

  it("minimal capture has no children key", () => {
    const parsed = JSON.parse(renderJSON(minimal));
    expect(parsed.children).toBeUndefined();
  });
});

// =============================================================================
// Field stripping
// =============================================================================

describe("renderJSON field stripping", () => {
  it("strips id from output", () => {
    const json = renderJSON(loginPage);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBeUndefined();
    // Check recursively
    function checkNoId(node: Record<string, unknown>): void {
      expect(node.id).toBeUndefined();
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          checkNoId(child as Record<string, unknown>);
        }
      }
    }
    checkNoId(parsed);
  });

  it("strips visible, enabled, focusable from output", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
            interactive: true,
            enabled: true,
            focusable: true,
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture));
    const btn = parsed.children[0];
    expect(btn.visible).toBeUndefined();
    expect(btn.enabled).toBeUndefined();
    expect(btn.focusable).toBeUndefined();
  });

  it("strips flags and z from output", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("MODAL", [0, 0, 1, 1] as const, {
            z: 10,
            flags: { sticky: true },
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture));
    const modal = parsed.children[0];
    expect(modal.z).toBeUndefined();
    expect(modal.flags).toBeUndefined();
  });
});

// =============================================================================
// Interactive flag
// =============================================================================

describe("renderJSON interactive", () => {
  it("includes interactive: true for interactive nodes", () => {
    const parsed = JSON.parse(renderJSON(singleButton));
    const btn = parsed.children[0];
    expect(btn.interactive).toBe(true);
  });

  it("omits interactive for non-interactive nodes", () => {
    const parsed = JSON.parse(renderJSON(minimal));
    expect(parsed.interactive).toBeUndefined();
  });
});

// =============================================================================
// Semantic hint
// =============================================================================

describe("renderJSON semantic", () => {
  it("includes semantic when present", () => {
    const parsed = JSON.parse(renderJSON(singleButton));
    const btn = parsed.children[0];
    expect(btn.semantic).toBe("primary_cta");
  });

  it("omits semantic when not present", () => {
    const parsed = JSON.parse(renderJSON(minimal));
    expect(parsed.semantic).toBeUndefined();
  });
});

// =============================================================================
// Text representation
// =============================================================================

describe("renderJSON text", () => {
  it("represents text as kind(len) string", () => {
    const parsed = JSON.parse(renderJSON(singleButton));
    const btn = parsed.children[0];
    // Text is short with len 6 → "short(6)"
    expect(btn.text).toBe("short(6)");
  });

  it("omits text for nodes with kind=none", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("TEXT", [0.1, 0.1, 0.8, 0.1] as const, {
            text: makeText("none"),
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture));
    expect(parsed.children[0].text).toBeUndefined();
  });

  it("handles text with no len", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("TEXT", [0.1, 0.1, 0.8, 0.1] as const, {
            text: makeText("paragraph"),
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture));
    // len is 0 → just kind
    expect(parsed.children[0].text).toBe("paragraph");
  });
});

// =============================================================================
// Children
// =============================================================================

describe("renderJSON children", () => {
  it("renders children recursively", () => {
    const parsed = JSON.parse(renderJSON(loginPage));
    expect(parsed.children).toBeDefined();
    expect(parsed.children.length).toBeGreaterThan(0);
  });

  it("preserves child ordering", () => {
    const parsed = JSON.parse(renderJSON(loginPage));
    const topRoles = parsed.children.map((c: { role: string }) => c.role);
    expect(topRoles[0]).toBe("HEADER");
    expect(topRoles[topRoles.length - 1]).toBe("FOOTER");
  });
});

// =============================================================================
// Options: maxDepth
// =============================================================================

describe("renderJSON maxDepth", () => {
  it("maxDepth 0 renders only root", () => {
    const parsed = JSON.parse(renderJSON(loginPage, { maxDepth: 0 }));
    expect(parsed.role).toBe("PAGE");
    expect(parsed.children).toBeUndefined();
  });

  it("maxDepth 1 renders root + direct children only", () => {
    const parsed = JSON.parse(renderJSON(loginPage, { maxDepth: 1 }));
    expect(parsed.children).toBeDefined();
    // Children should exist but have no grandchildren
    for (const child of parsed.children) {
      expect(child.children).toBeUndefined();
    }
  });

  it("default maxDepth renders full tree", () => {
    const parsed = JSON.parse(renderJSON(deepNesting));
    // Deep nesting goes 8 levels — verify at least some depth
    let node = parsed;
    let depth = 0;
    while (node.children && node.children.length > 0) {
      node = node.children[0];
      depth++;
    }
    expect(depth).toBeGreaterThan(3);
  });
});

// =============================================================================
// Options: includeHandlers
// =============================================================================

describe("renderJSON includeHandlers", () => {
  it("excludes handlers by default", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
            interactive: true,
            handlers: [{ event: "click", intent: "submit_form" }],
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture));
    expect(parsed.children[0].handlers).toBeUndefined();
  });

  it("includes handlers when option is true", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
            interactive: true,
            handlers: [{ event: "click", intent: "submit_form", target: "form-1" }],
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture, { includeHandlers: true }));
    const btn = parsed.children[0];
    expect(btn.handlers).toBeDefined();
    expect(btn.handlers).toHaveLength(1);
    expect(btn.handlers[0].event).toBe("click");
    expect(btn.handlers[0].intent).toBe("submit_form");
    expect(btn.handlers[0].target).toBe("form-1");
  });
});

// =============================================================================
// Options: includeBindings
// =============================================================================

describe("renderJSON includeBindings", () => {
  it("excludes bindings by default", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("INPUT", [0.1, 0.1, 0.5, 0.05] as const, {
            interactive: true,
            bindings: [{ property: "value", expression: "state.email" }],
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture));
    expect(parsed.children[0].bindings).toBeUndefined();
  });

  it("includes bindings when option is true", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("INPUT", [0.1, 0.1, 0.5, 0.05] as const, {
            interactive: true,
            bindings: [{ property: "value", expression: "state.email" }],
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture, { includeBindings: true }));
    const input = parsed.children[0];
    expect(input.bindings).toBeDefined();
    expect(input.bindings).toHaveLength(1);
    expect(input.bindings[0].property).toBe("value");
    expect(input.bindings[0].expression).toBe("state.email");
  });
});

// =============================================================================
// Options: includeState
// =============================================================================

describe("renderJSON includeState", () => {
  it("excludes state by default", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("INPUT", [0.1, 0.1, 0.5, 0.05] as const, {
            interactive: true,
            state: [{ key: "form.email", access: "readwrite", scope: "local" }],
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture));
    expect(parsed.children[0].state).toBeUndefined();
  });

  it("includes state when option is true", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("INPUT", [0.1, 0.1, 0.5, 0.05] as const, {
            interactive: true,
            state: [{ key: "form.email", access: "readwrite", scope: "local" }],
          }),
        ],
      }),
    );
    const parsed = JSON.parse(renderJSON(capture, { includeState: true }));
    const input = parsed.children[0];
    expect(input.state).toBeDefined();
    expect(input.state).toHaveLength(1);
    expect(input.state[0].key).toBe("form.email");
    expect(input.state[0].access).toBe("readwrite");
    expect(input.state[0].scope).toBe("local");
  });
});

// =============================================================================
// Determinism
// =============================================================================

describe("renderJSON determinism", () => {
  it("produces identical output on repeated calls", () => {
    const a = renderJSON(loginPage);
    const b = renderJSON(loginPage);
    expect(a).toBe(b);
  });

  it("produces identical output with options on repeated calls", () => {
    const opts: RenderJSONOptions = {
      includeHandlers: true,
      includeBindings: true,
      includeState: true,
      maxDepth: 5,
    };
    const a = renderJSON(loginPage, opts);
    const b = renderJSON(loginPage, opts);
    expect(a).toBe(b);
  });
});
