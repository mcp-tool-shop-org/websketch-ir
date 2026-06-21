import { describe, it, expect } from "vitest";
import {
  validateCapture,
  parseCapture,
  hashNodeShallow,
  nodeSimilarity,
  emitNodeHTML,
  VALID_STYLE_INTENT_TOKENS,
  VALID_DENSITIES,
  VALID_SIZES,
} from "../src/index.js";
import { makeCapture, makeNode } from "./fixtures/index.js";

// =============================================================================
// Grammar — VALID_STYLE_INTENT_TOKENS / VALID_DENSITIES / VALID_SIZES
// =============================================================================

describe("VALID_STYLE_INTENT_TOKENS", () => {
  it("contains all 15 tokens", () => {
    expect(VALID_STYLE_INTENT_TOKENS.size).toBe(15);
    for (const t of [
      "primary", "secondary", "destructive", "success", "warning",
      "info", "muted", "elevated", "outlined", "ghost",
      "inverted", "highlight", "truncated", "monospace", "custom",
    ]) {
      expect(VALID_STYLE_INTENT_TOKENS.has(t)).toBe(true);
    }
  });
});

describe("VALID_DENSITIES", () => {
  it("contains 3 values", () => {
    expect(VALID_DENSITIES.size).toBe(3);
    for (const d of ["compact", "normal", "spacious"]) {
      expect(VALID_DENSITIES.has(d)).toBe(true);
    }
  });
});

describe("VALID_SIZES", () => {
  it("contains 5 values", () => {
    expect(VALID_SIZES.size).toBe(5);
    for (const s of ["xs", "sm", "md", "lg", "xl"]) {
      expect(VALID_SIZES.has(s)).toBe(true);
    }
  });
});

// =============================================================================
// Validation — style
// =============================================================================

describe("validateCapture style intent", () => {
  it("node with valid style → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: {
            tokens: ["primary", "elevated"],
            density: "normal",
            size: "md",
          },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("style with tokens only (no density/size) → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: { tokens: ["destructive"] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("empty tokens array → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: { tokens: [] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("non-object style → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: "primary" as unknown as { tokens: [] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("style");
  });

  it("missing tokens field → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: { density: "normal" } as unknown as { tokens: [] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const tokenIssue = issues.find((i) => i.path.includes("tokens"));
    expect(tokenIssue).toBeDefined();
  });

  it("invalid token value → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: { tokens: ["neon"] } as unknown as { tokens: [] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const tokenIssue = issues.find((i) => i.message.includes("Invalid style intent token"));
    expect(tokenIssue).toBeDefined();
  });

  it("invalid density → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: { tokens: ["primary"], density: "dense" } as unknown as { tokens: [] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const densityIssue = issues.find((i) => i.message.includes("Invalid density"));
    expect(densityIssue).toBeDefined();
  });

  it("invalid size → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: { tokens: ["primary"], size: "huge" } as unknown as { tokens: [] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const sizeIssue = issues.find((i) => i.message.includes("Invalid size"));
    expect(sizeIssue).toBeDefined();
  });

  it("non-string token element → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: { tokens: [42] } as unknown as { tokens: [] },
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Hashing — style intent affects hash
// =============================================================================

describe("hashNodeShallow with style", () => {
  it("style does NOT change hash by default (includeStyle=false)", () => {
    const withStyle = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary", "elevated"] },
    });
    const withoutStyle = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    expect(hashNodeShallow(withStyle)).toBe(hashNodeShallow(withoutStyle));
  });

  it("includeStyle: true makes style affect hash", () => {
    const withStyle = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary", "elevated"] },
    });
    const withoutStyle = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    expect(hashNodeShallow(withStyle, { includeStyle: true }))
      .not.toBe(hashNodeShallow(withoutStyle, { includeStyle: true }));
  });

  it("different tokens → different hash (with includeStyle)", () => {
    const a = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary"] },
    });
    const b = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["destructive"] },
    });
    expect(hashNodeShallow(a, { includeStyle: true }))
      .not.toBe(hashNodeShallow(b, { includeStyle: true }));
  });

  it("token ordering is normalized (sorted)", () => {
    const a = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["elevated", "primary"] },
    });
    const b = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary", "elevated"] },
    });
    expect(hashNodeShallow(a, { includeStyle: true }))
      .toBe(hashNodeShallow(b, { includeStyle: true }));
  });
});

// =============================================================================
// Similarity — style token overlap
// =============================================================================

describe("nodeSimilarity with style", () => {
  it("shared style tokens boost similarity", () => {
    const withTokens = (tokens: string[]) =>
      makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
        interactive: true,
        style: { tokens: tokens as ("primary" | "destructive" | "elevated")[] },
      });

    const simShared = nodeSimilarity(
      withTokens(["primary", "elevated"]),
      withTokens(["primary", "destructive"]),
    );
    const simDisjoint = nodeSimilarity(
      withTokens(["primary"]),
      withTokens(["destructive"]),
    );
    expect(simShared).toBeGreaterThan(simDisjoint);
  });
});

// =============================================================================
// Codegen — style data attributes
// =============================================================================

describe("emitNodeHTML with style intent", () => {
  it("includes style tokens as data-wsk-style", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary", "elevated"] },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("data-wsk-style=");
    // Tokens sorted alphabetically
    expect(html).toContain('"elevated primary"');
  });

  it("includes density as data-wsk-density", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary"], density: "compact" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-density="compact"');
  });

  it("includes size as data-wsk-size", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary"], size: "lg" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-size="lg"');
  });

  it("omits style attributes when includeStyle: false", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: ["primary", "elevated"], density: "compact", size: "lg" },
    });
    const html = emitNodeHTML(node, { includeStyle: false });
    expect(html).not.toContain("data-wsk-style");
    expect(html).not.toContain("data-wsk-density");
    expect(html).not.toContain("data-wsk-size");
  });

  it("empty tokens array → no data-wsk-style attribute", () => {
    const node = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      style: { tokens: [] },
    });
    const html = emitNodeHTML(node);
    expect(html).not.toContain("data-wsk-style");
  });
});

// =============================================================================
// parseCapture round-trip with style
// =============================================================================

describe("parseCapture with style intent", () => {
  it("valid capture with style round-trips", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          style: {
            tokens: ["primary", "elevated"],
            density: "normal",
            size: "md",
          },
        }),
      ],
    });
    const capture = makeCapture(root);
    const json = JSON.stringify(capture);
    const parsed = parseCapture(json);
    expect(parsed.root.children![0].style).toEqual({
      tokens: ["primary", "elevated"],
      density: "normal",
      size: "md",
    });
  });
});

// =============================================================================
// Combined: state + style + handlers together
// =============================================================================

describe("combined state + style + handlers", () => {
  it("node with all P0 + P1 features validates and round-trips", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          semantic: "checkout",
          handlers: [{ event: "click", intent: "submit_order" }],
          bindings: [{ property: "text", expression: "state.buttonLabel" }],
          state: [
            { key: "cart.items", access: "read", scope: "global" },
            { key: "cart.loading", access: "condition", scope: "global" },
          ],
          style: {
            tokens: ["primary", "elevated"],
            size: "lg",
          },
        }),
      ],
    });
    const capture = makeCapture(root);

    // Validates cleanly
    const issues = validateCapture(capture);
    expect(issues).toHaveLength(0);

    // Round-trips through JSON
    const parsed = parseCapture(JSON.stringify(capture));
    const btn = parsed.root.children![0];
    expect(btn.handlers).toHaveLength(1);
    expect(btn.bindings).toHaveLength(1);
    expect(btn.state).toHaveLength(2);
    expect(btn.style?.tokens).toEqual(["primary", "elevated"]);
    expect(btn.style?.size).toBe("lg");
  });
});
