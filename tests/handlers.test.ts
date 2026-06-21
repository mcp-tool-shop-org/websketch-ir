import { describe, it, expect } from "vitest";
import {
  validateCapture,
  parseCapture,
  hashNodeShallow,
  nodeSimilarity,
  VALID_EVENT_TYPES,
} from "../src/index.js";
import { makeCapture, makeNode } from "./fixtures/index.js";

// =============================================================================
// Grammar — VALID_EVENT_TYPES
// =============================================================================

describe("VALID_EVENT_TYPES", () => {
  it("contains all 11 event types", () => {
    expect(VALID_EVENT_TYPES.size).toBe(11);
    for (const e of ["click", "hover", "focus", "blur", "submit", "change", "input", "keydown", "scroll", "drag", "custom"]) {
      expect(VALID_EVENT_TYPES.has(e)).toBe(true);
    }
  });
});

// =============================================================================
// Validation — handlers
// =============================================================================

describe("validateCapture handlers", () => {
  it("node with valid handlers → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: [
            { event: "click", intent: "submit_form" },
            { event: "hover", intent: "show_tooltip", target: "tooltip_1" },
          ],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("node with empty handlers array → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("non-array handlers → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: "click" as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("handlers");
  });

  it("handler with invalid event type → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: [{ event: "doubleclick", intent: "zoom" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const eventIssue = issues.find((i) => i.path.includes("event"));
    expect(eventIssue).toBeDefined();
    expect(eventIssue!.message).toContain("Invalid event type");
  });

  it("handler with missing intent → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: [{ event: "click" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const intentIssue = issues.find((i) => i.path.includes("intent"));
    expect(intentIssue).toBeDefined();
  });

  it("handler with non-string target → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: [{ event: "click", intent: "open", target: 42 }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const targetIssue = issues.find((i) => i.path.includes("target"));
    expect(targetIssue).toBeDefined();
  });

  it("handler that is not an object → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: ["click"] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Validation — bindings
// =============================================================================

describe("validateCapture bindings", () => {
  it("node with valid bindings → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
          interactive: true,
          bindings: [
            { property: "value", expression: "state.username" },
            { property: "visible", expression: "state.showLogin" },
          ],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("non-array bindings → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
          interactive: true,
          bindings: {} as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("bindings");
  });

  it("binding with missing property → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
          interactive: true,
          bindings: [{ expression: "state.x" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const propIssue = issues.find((i) => i.path.includes("property"));
    expect(propIssue).toBeDefined();
  });

  it("binding with missing expression → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
          interactive: true,
          bindings: [{ property: "value" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const exprIssue = issues.find((i) => i.path.includes("expression"));
    expect(exprIssue).toBeDefined();
  });

  it("binding that is not an object → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
          interactive: true,
          bindings: ["value=x"] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Hashing — handlers affect hash
// =============================================================================

describe("hashNodeShallow with handlers", () => {
  it("handlers change the hash (default: includeHandlers=true)", () => {
    const withHandler = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "submit_form" }],
    });
    const withoutHandler = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
    });
    expect(hashNodeShallow(withHandler)).not.toBe(hashNodeShallow(withoutHandler));
  });

  it("includeHandlers: false ignores handlers", () => {
    const withHandler = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "submit_form" }],
    });
    const withoutHandler = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
    });
    expect(hashNodeShallow(withHandler, { includeHandlers: false }))
      .toBe(hashNodeShallow(withoutHandler, { includeHandlers: false }));
  });

  it("different handler intents → different hash", () => {
    const a = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "submit_form" }],
    });
    const b = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      handlers: [{ event: "click", intent: "navigate" }],
    });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("handler ordering is normalized (sorted)", () => {
    const a = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      handlers: [
        { event: "hover", intent: "tooltip" },
        { event: "click", intent: "submit" },
      ],
    });
    const b = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
      handlers: [
        { event: "click", intent: "submit" },
        { event: "hover", intent: "tooltip" },
      ],
    });
    expect(hashNodeShallow(a)).toBe(hashNodeShallow(b));
  });
});

// =============================================================================
// Similarity — handler matching
// =============================================================================

describe("nodeSimilarity with handlers", () => {
  it("same handlers boost similarity", () => {
    const base = makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
      interactive: true,
    });
    const withSameHandlers = (handlers: typeof base.handlers) =>
      makeNode("BUTTON", [0.1, 0.2, 0.3, 0.4] as const, {
        interactive: true,
        handlers,
      });

    const simNoHandlers = nodeSimilarity(base, base);
    const simWithHandlers = nodeSimilarity(
      withSameHandlers([{ event: "click", intent: "submit" }]),
      withSameHandlers([{ event: "click", intent: "submit" }]),
    );
    expect(simWithHandlers).toBeGreaterThanOrEqual(simNoHandlers);
  });
});

// =============================================================================
// parseCapture round-trip with handlers & bindings
// =============================================================================

describe("parseCapture with handlers and bindings", () => {
  it("valid capture with handlers round-trips", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("BUTTON", [0.1, 0.1, 0.2, 0.05] as const, {
          interactive: true,
          handlers: [{ event: "click", intent: "toggle_menu", target: "menu_1" }],
        }),
        makeNode("INPUT", [0.1, 0.2, 0.3, 0.05] as const, {
          interactive: true,
          bindings: [{ property: "value", expression: "state.query" }],
        }),
      ],
    });
    const capture = makeCapture(root);
    const json = JSON.stringify(capture);
    const parsed = parseCapture(json);
    expect(parsed.root.children![0].handlers).toEqual([
      { event: "click", intent: "toggle_menu", target: "menu_1" },
    ]);
    expect(parsed.root.children![1].bindings).toEqual([
      { property: "value", expression: "state.query" },
    ]);
  });
});
