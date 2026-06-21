import { describe, it, expect } from "vitest";
import {
  validateCapture,
  hashNodeShallow,
  hashNodeDeep,
  nodeSimilarity,
  VALID_PATTERN_KINDS,
  type PatternKind,
  type PatternSignal,
} from "../src/index.js";
import { emitHTML, emitNodeHTML } from "../src/codegen/index.js";
import { makeCapture, makeNode } from "./fixtures/index.js";

// =============================================================================
// Grammar & Constants
// =============================================================================

describe("PatternSignal grammar", () => {
  it("VALID_PATTERN_KINDS contains all expected kinds", () => {
    const expected: PatternKind[] = [
      "search_bar", "auth_form", "product_card", "nav_menu",
      "data_table", "wizard_step", "media_player", "chat_thread",
      "dashboard_widget", "custom",
    ];
    for (const kind of expected) {
      expect(VALID_PATTERN_KINDS.has(kind)).toBe(true);
    }
    expect(VALID_PATTERN_KINDS.size).toBe(expected.length);
  });
});

// =============================================================================
// Validation
// =============================================================================

describe("PatternSignal validation", () => {
  const base = () =>
    makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
            pattern: { kind: "auth_form", variant: "login" },
          }),
        ],
      })
    );

  it("accepts a valid PatternSignal with all fields", () => {
    const cap = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("SECTION", [0.1, 0.1, 0.8, 0.8] as const, {
            pattern: {
              kind: "wizard_step",
              name: "checkout-wizard",
              variant: "payment",
              slot: "step-2",
            } as PatternSignal,
          }),
        ],
      })
    );
    expect(validateCapture(cap)).toHaveLength(0);
  });

  it("accepts a valid PatternSignal with only kind", () => {
    const cap = base();
    expect(validateCapture(cap)).toHaveLength(0);
  });

  it("accepts every valid PatternKind", () => {
    for (const kind of VALID_PATTERN_KINDS) {
      const cap = makeCapture(
        makeNode("PAGE", [0, 0, 1, 1] as const, {
          children: [
            makeNode("SECTION", [0, 0, 1, 1] as const, {
              pattern: { kind } as PatternSignal,
            }),
          ],
        })
      );
      expect(validateCapture(cap)).toHaveLength(0);
    }
  });

  it("rejects unknown pattern kind", () => {
    const raw = JSON.parse(JSON.stringify(base()));
    raw.root.children[0].pattern.kind = "nonexistent";
    const issues = validateCapture(raw);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("pattern.kind");
  });

  it("rejects non-string pattern kind", () => {
    const raw = JSON.parse(JSON.stringify(base()));
    raw.root.children[0].pattern.kind = 42;
    const issues = validateCapture(raw);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("pattern.kind");
  });

  it("rejects non-object pattern", () => {
    const raw = JSON.parse(JSON.stringify(base()));
    raw.root.children[0].pattern = "auth_form";
    const issues = validateCapture(raw);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("pattern");
  });

  it("rejects non-string name", () => {
    const raw = JSON.parse(JSON.stringify(base()));
    raw.root.children[0].pattern.name = 123;
    const issues = validateCapture(raw);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("pattern.name");
  });

  it("rejects non-string variant", () => {
    const raw = JSON.parse(JSON.stringify(base()));
    raw.root.children[0].pattern.variant = true;
    const issues = validateCapture(raw);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("pattern.variant");
  });

  it("rejects non-string slot", () => {
    const raw = JSON.parse(JSON.stringify(base()));
    raw.root.children[0].pattern.slot = [];
    const issues = validateCapture(raw);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("pattern.slot");
  });

  it("nodes without pattern are still valid", () => {
    const cap = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const));
    expect(validateCapture(cap)).toHaveLength(0);
  });
});

// =============================================================================
// Hashing
// =============================================================================

describe("PatternSignal hashing", () => {
  const nodeWith = (pattern: PatternSignal) =>
    makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, { pattern });

  it("pattern changes the shallow hash (default: includePattern=true)", () => {
    const without = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const);
    const with_ = nodeWith({ kind: "auth_form" });
    expect(hashNodeShallow(without)).not.toBe(hashNodeShallow(with_));
  });

  it("different kind → different hash", () => {
    const a = nodeWith({ kind: "auth_form" });
    const b = nodeWith({ kind: "search_bar" });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("different name → different hash", () => {
    const a = nodeWith({ kind: "auth_form", name: "login" });
    const b = nodeWith({ kind: "auth_form", name: "register" });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("different variant → different hash", () => {
    const a = nodeWith({ kind: "wizard_step", variant: "step-1" });
    const b = nodeWith({ kind: "wizard_step", variant: "step-2" });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("different slot → different hash", () => {
    const a = nodeWith({ kind: "wizard_step", slot: "header" });
    const b = nodeWith({ kind: "wizard_step", slot: "footer" });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("includePattern: false ignores pattern", () => {
    const without = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const);
    const with_ = nodeWith({ kind: "auth_form", name: "login" });
    expect(hashNodeShallow(without, { includePattern: false })).toBe(
      hashNodeShallow(with_, { includePattern: false })
    );
  });

  it("pattern included in deep hash", () => {
    const parent = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [nodeWith({ kind: "search_bar" })],
    });
    const parentNoPat = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const)],
    });
    expect(hashNodeDeep(parent)).not.toBe(hashNodeDeep(parentNoPat));
  });
});

// =============================================================================
// Similarity
// =============================================================================

describe("PatternSignal similarity scoring", () => {
  it("same pattern kind → higher similarity than mismatched pattern", () => {
    const a = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form" },
    });
    const b = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form" },
    });
    const c = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "search_bar" },
    });

    const simSamePattern = nodeSimilarity(a, b);
    const simDiffPattern = nodeSimilarity(a, c);
    expect(simSamePattern).toBeGreaterThan(simDiffPattern);
    expect(simSamePattern).toBeGreaterThan(0.7);
  });

  it("different pattern kind → lower similarity than same kind", () => {
    const a = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form" },
    });
    const b = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "search_bar" },
    });
    const c = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form" },
    });
    expect(nodeSimilarity(a, c)).toBeGreaterThan(nodeSimilarity(a, b));
  });

  it("same kind + same name → higher than same kind alone", () => {
    const a = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form", name: "login" },
    });
    const b = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form", name: "login" },
    });
    const c = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form", name: "register" },
    });
    expect(nodeSimilarity(a, b)).toBeGreaterThan(nodeSimilarity(a, c));
  });
});

// =============================================================================
// Codegen
// =============================================================================

describe("PatternSignal codegen", () => {
  it("emits data-wsk-pattern attribute", () => {
    const node = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern="auth_form"');
  });

  it("emits data-wsk-pattern-name when present", () => {
    const node = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form", name: "login-form" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern="auth_form"');
    expect(html).toContain('data-wsk-pattern-name="login-form"');
  });

  it("emits data-wsk-pattern-variant when present", () => {
    const node = makeNode("SECTION", [0, 0, 1, 1] as const, {
      pattern: { kind: "wizard_step", variant: "payment" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern-variant="payment"');
  });

  it("emits data-wsk-pattern-slot when present", () => {
    const node = makeNode("SECTION", [0, 0, 1, 1] as const, {
      pattern: { kind: "wizard_step", slot: "step-2" },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern-slot="step-2"');
  });

  it("emits all pattern attributes together", () => {
    const node = makeNode("SECTION", [0.1, 0.1, 0.8, 0.8] as const, {
      pattern: {
        kind: "dashboard_widget",
        name: "revenue-chart",
        variant: "line",
        slot: "main-content",
      },
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-pattern="dashboard_widget"');
    expect(html).toContain('data-wsk-pattern-name="revenue-chart"');
    expect(html).toContain('data-wsk-pattern-variant="line"');
    expect(html).toContain('data-wsk-pattern-slot="main-content"');
  });

  it("includePattern: false suppresses pattern attributes", () => {
    const node = makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
      pattern: { kind: "auth_form", name: "login" },
    });
    const html = emitNodeHTML(node, { includePattern: false });
    expect(html).not.toContain("data-wsk-pattern");
  });

  it("pattern attributes appear in full capture emission", () => {
    const cap = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("NAV", [0, 0, 1, 0.1] as const, {
            pattern: { kind: "nav_menu", name: "top-nav" },
          }),
          makeNode("FORM", [0.2, 0.2, 0.6, 0.6] as const, {
            pattern: { kind: "auth_form", variant: "login" },
          }),
        ],
      })
    );
    const html = emitHTML(cap);
    expect(html).toContain('data-wsk-pattern="nav_menu"');
    expect(html).toContain('data-wsk-pattern-name="top-nav"');
    expect(html).toContain('data-wsk-pattern="auth_form"');
    expect(html).toContain('data-wsk-pattern-variant="login"');
  });
});

// =============================================================================
// Round-trip: validate → hash → codegen
// =============================================================================

describe("PatternSignal round-trip", () => {
  it("node with pattern validates, hashes deterministically, and produces HTML", () => {
    const node = makeNode("SECTION", [0.1, 0.1, 0.8, 0.8] as const, {
      pattern: {
        kind: "product_card",
        name: "featured-product",
        variant: "premium",
        slot: "hero",
      },
    });
    const cap = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, { children: [node] })
    );

    // Validate
    expect(validateCapture(cap)).toHaveLength(0);

    // Hash (deterministic)
    const h1 = hashNodeShallow(node);
    const h2 = hashNodeShallow(node);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{16}$/);

    // Codegen
    const html = emitHTML(cap);
    expect(html).toContain('data-wsk-pattern="product_card"');
    expect(html).toContain('data-wsk-pattern-name="featured-product"');
    expect(html).toContain('data-wsk-pattern-variant="premium"');
    expect(html).toContain('data-wsk-pattern-slot="hero"');
  });
});
