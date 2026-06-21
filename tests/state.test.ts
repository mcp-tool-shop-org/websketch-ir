import { describe, it, expect } from "vitest";
import {
  validateCapture,
  parseCapture,
  hashNodeShallow,
  nodeSimilarity,
  emitNodeHTML,
  emitHTML,
  VALID_STATE_ACCESS_KINDS,
  VALID_STATE_SCOPES,
} from "../src/index.js";
import { makeCapture, makeNode } from "./fixtures/index.js";

// =============================================================================
// Grammar — VALID_STATE_ACCESS_KINDS & VALID_STATE_SCOPES
// =============================================================================

describe("VALID_STATE_ACCESS_KINDS", () => {
  it("contains all 4 access kinds", () => {
    expect(VALID_STATE_ACCESS_KINDS.size).toBe(4);
    for (const k of ["read", "write", "readwrite", "condition"]) {
      expect(VALID_STATE_ACCESS_KINDS.has(k)).toBe(true);
    }
  });
});

describe("VALID_STATE_SCOPES", () => {
  it("contains all 3 scopes", () => {
    expect(VALID_STATE_SCOPES.size).toBe(3);
    for (const s of ["local", "global", "url"]) {
      expect(VALID_STATE_SCOPES.has(s)).toBe(true);
    }
  });
});

// =============================================================================
// Validation — state
// =============================================================================

describe("validateCapture state signals", () => {
  it("node with valid state signals → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
          interactive: true,
          state: [
            { key: "form.email", access: "readwrite", scope: "local" },
            { key: "user.isLoggedIn", access: "condition", scope: "global" },
          ],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("state without scope → zero issues (scope is optional)", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, {
          state: [{ key: "count", access: "read" }],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("empty state array → zero issues", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, { state: [] }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues).toHaveLength(0);
  });

  it("non-array state → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, {
          state: "read" as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toContain("state");
  });

  it("state signal missing key → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, {
          state: [{ access: "read" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const keyIssue = issues.find((i) => i.path.includes("key"));
    expect(keyIssue).toBeDefined();
  });

  it("state signal missing access → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, {
          state: [{ key: "count" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const accessIssue = issues.find((i) => i.path.includes("access"));
    expect(accessIssue).toBeDefined();
  });

  it("invalid access kind → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, {
          state: [{ key: "x", access: "delete" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const accessIssue = issues.find((i) => i.message.includes("Invalid state access"));
    expect(accessIssue).toBeDefined();
  });

  it("invalid scope → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, {
          state: [{ key: "x", access: "read", scope: "session" }] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
    const scopeIssue = issues.find((i) => i.message.includes("Invalid state scope"));
    expect(scopeIssue).toBeDefined();
  });

  it("state signal that is not an object → issue", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("TEXT", [0.1, 0.1, 0.3, 0.05] as const, {
          state: ["count:read"] as unknown as [],
        }),
      ],
    });
    const issues = validateCapture(makeCapture(root));
    expect(issues.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Hashing — state signals affect hash
// =============================================================================

describe("hashNodeShallow with state", () => {
  it("state changes the hash (default: includeState=true)", () => {
    const withState = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      state: [{ key: "form.email", access: "readwrite" }],
    });
    const withoutState = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    expect(hashNodeShallow(withState)).not.toBe(hashNodeShallow(withoutState));
  });

  it("includeState: false ignores state", () => {
    const withState = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      state: [{ key: "form.email", access: "readwrite" }],
    });
    const withoutState = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
    });
    expect(hashNodeShallow(withState, { includeState: false }))
      .toBe(hashNodeShallow(withoutState, { includeState: false }));
  });

  it("different state keys → different hash", () => {
    const a = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      state: [{ key: "form.email", access: "readwrite" }],
    });
    const b = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      state: [{ key: "form.password", access: "readwrite" }],
    });
    expect(hashNodeShallow(a)).not.toBe(hashNodeShallow(b));
  });

  it("state ordering is normalized (sorted by key)", () => {
    const a = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      state: [
        { key: "form.password", access: "write" },
        { key: "form.email", access: "read" },
      ],
    });
    const b = makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
      interactive: true,
      state: [
        { key: "form.email", access: "read" },
        { key: "form.password", access: "write" },
      ],
    });
    expect(hashNodeShallow(a)).toBe(hashNodeShallow(b));
  });
});

// =============================================================================
// Similarity — state key overlap
// =============================================================================

describe("nodeSimilarity with state", () => {
  it("shared state keys boost similarity", () => {
    const withSharedState = (keys: string[]) =>
      makeNode("INPUT", [0.1, 0.2, 0.3, 0.04] as const, {
        interactive: true,
        state: keys.map((k) => ({ key: k, access: "read" as const })),
      });

    const simShared = nodeSimilarity(
      withSharedState(["form.email", "form.name"]),
      withSharedState(["form.email", "form.phone"]),
    );
    const simDisjoint = nodeSimilarity(
      withSharedState(["form.email"]),
      withSharedState(["cart.total"]),
    );
    expect(simShared).toBeGreaterThan(simDisjoint);
  });
});

// =============================================================================
// Codegen — state data attributes
// =============================================================================

describe("emitNodeHTML with state signals", () => {
  it("includes state as data-wsk-state attribute", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
      state: [
        { key: "form.email", access: "readwrite", scope: "local" },
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain('data-wsk-state="form.email:readwrite@local"');
  });

  it("multiple state entries separated by semicolons", () => {
    const node = makeNode("BUTTON", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
      state: [
        { key: "cart.total", access: "read", scope: "global" },
        { key: "cart.loading", access: "condition" },
      ],
    });
    const html = emitNodeHTML(node);
    expect(html).toContain("data-wsk-state=");
    expect(html).toContain("cart.loading:condition");
    expect(html).toContain("cart.total:read@global");
  });

  it("omits state attributes when includeState: false", () => {
    const node = makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
      interactive: true,
      state: [{ key: "form.email", access: "readwrite" }],
    });
    const html = emitNodeHTML(node, { includeState: false });
    expect(html).not.toContain("data-wsk-state");
  });
});

// =============================================================================
// parseCapture round-trip with state
// =============================================================================

describe("parseCapture with state signals", () => {
  it("valid capture with state round-trips", () => {
    const root = makeNode("PAGE", [0, 0, 1, 1] as const, {
      children: [
        makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
          interactive: true,
          state: [
            { key: "form.email", access: "readwrite", scope: "local" },
            { key: "user.isLoggedIn", access: "condition", scope: "global" },
          ],
        }),
      ],
    });
    const capture = makeCapture(root);
    const json = JSON.stringify(capture);
    const parsed = parseCapture(json);
    expect(parsed.root.children![0].state).toEqual([
      { key: "form.email", access: "readwrite", scope: "local" },
      { key: "user.isLoggedIn", access: "condition", scope: "global" },
    ]);
  });
});
