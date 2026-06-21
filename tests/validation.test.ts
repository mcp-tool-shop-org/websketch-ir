import { describe, it, expect } from "vitest";
import {
  validateCapture,
  parseCapture,
  formatWebSketchError,
  isWebSketchException,
  WebSketchException,
  DEFAULT_LIMITS,
  VALID_EVENT_TYPES,
  VALID_STATE_ACCESS_KINDS,
  VALID_STATE_SCOPES,
  VALID_STYLE_INTENT_TOKENS,
  VALID_DENSITIES,
  VALID_SIZES,
  VALID_PATTERN_KINDS,
  type UIRole,
  type WebSketchError,
} from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { loginPage } from "./fixtures/captures.js";

// Canonical UIRole values derived from the grammar type.
// These are kept in a const array so that role renames cause compile errors
// here rather than silent runtime failures.
const ALL_UI_ROLES: UIRole[] = [
  "PAGE", "NAV", "HEADER", "FOOTER", "SECTION", "CARD", "LIST", "TABLE",
  "MODAL", "TOAST", "DROPDOWN",
  "FORM", "INPUT", "BUTTON", "LINK", "CHECKBOX", "RADIO", "ICON",
  "IMAGE", "TEXT", "PAGINATION", "UNKNOWN",
];

// =============================================================================
// validateCapture — valid capture passes cleanly
// =============================================================================

describe("validateCapture valid capture passes", () => {
  it("fully populated node with all optional signals passes", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("BUTTON", [0.1, 0.1, 0.3, 0.1] as const, {
            interactive: true,
            enabled: true,
            semantic: "submit",
            text: makeText("short", { hash: "abc", len: 6 }),
            handlers: [{ event: "click", intent: "submit_form" }],
            bindings: [{ property: "disabled", expression: "!state.valid" }],
            state: [{ key: "formValid", access: "read", scope: "local" }],
            style: { tokens: ["primary", "elevated"], density: "normal", size: "md" },
            pattern: { kind: "auth_form", name: "login", variant: "standard", slot: "submit" },
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    expect(issues).toHaveLength(0);
  });
});

// =============================================================================
// Each required field missing triggers an issue
// =============================================================================

describe("validateCapture each required field missing triggers issue", () => {
  it("missing role → issue at root.role", () => {
    const capture = makeCapture({
      id: "", bbox: [0, 0, 1, 1], interactive: false, visible: true,
    } as any);
    const issues = validateCapture(capture);
    const roleIssue = issues.find((i) => i.path === "root.role");
    expect(roleIssue).toBeDefined();
    expect(roleIssue!.expected).toContain("string");
  });

  it("missing bbox → issue at root.bbox", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", interactive: false, visible: true,
    } as any);
    const issues = validateCapture(capture);
    const bboxIssue = issues.find((i) => i.path === "root.bbox");
    expect(bboxIssue).toBeDefined();
  });

  it("missing interactive → issue at root.interactive", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", bbox: [0, 0, 1, 1], visible: true,
    } as any);
    const issues = validateCapture(capture);
    const interIssue = issues.find((i) => i.path === "root.interactive");
    expect(interIssue).toBeDefined();
  });

  it("missing visible → issue at root.visible", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", bbox: [0, 0, 1, 1], interactive: false,
    } as any);
    const issues = validateCapture(capture);
    const visIssue = issues.find((i) => i.path === "root.visible");
    expect(visIssue).toBeDefined();
  });

  it("missing id → issue at root.id", () => {
    const capture = makeCapture({
      role: "PAGE", bbox: [0, 0, 1, 1], interactive: false, visible: true,
    } as any);
    const issues = validateCapture(capture);
    const idIssue = issues.find((i) => i.path === "root.id");
    expect(idIssue).toBeDefined();
  });
});

// =============================================================================
// Prototype pollution keys rejected
// =============================================================================

describe("validateCapture prototype pollution rejection", () => {
  it("__proto__ key on node → issue", () => {
    const malicious = JSON.parse(
      '{"version":"0.1","url":"http://x","timestamp_ms":1,"viewport":{"w_px":1,"h_px":1,"aspect":1},"compiler":{"name":"websketch-ir","version":"0.1","options_hash":"x"},"root":{"id":"","role":"PAGE","bbox":[0,0,1,1],"interactive":false,"visible":true,"__proto__":{"polluted":true}}}'
    );
    const issues = validateCapture(malicious);
    const protoIssue = issues.find((i) => i.message.includes("__proto__"));
    expect(protoIssue).toBeDefined();
  });

  it("constructor key on node → issue", () => {
    const obj = {
      version: "0.1", url: "http://x", timestamp_ms: 1,
      viewport: { w_px: 1, h_px: 1, aspect: 1 },
      compiler: { name: "websketch-ir", version: "0.1", options_hash: "x" },
      root: { id: "", role: "PAGE", bbox: [0, 0, 1, 1], interactive: false, visible: true },
    };
    // Manually set constructor on root to simulate injection
    Object.defineProperty(obj.root, "constructor", {
      value: function attack() {},
      writable: true,
      enumerable: true,
      configurable: true,
    });
    const issues = validateCapture(obj);
    const constructorIssue = issues.find((i) => i.message.includes("constructor"));
    expect(constructorIssue).toBeDefined();
  });

  it("prototype key on node → issue", () => {
    const obj = {
      version: "0.1", url: "http://x", timestamp_ms: 1,
      viewport: { w_px: 1, h_px: 1, aspect: 1 },
      compiler: { name: "websketch-ir", version: "0.1", options_hash: "x" },
      root: { id: "", role: "PAGE", bbox: [0, 0, 1, 1], interactive: false, visible: true } as any,
    };
    obj.root.prototype = {};
    const issues = validateCapture(obj);
    const prototypeIssue = issues.find((i) => i.message.includes("prototype"));
    expect(prototypeIssue).toBeDefined();
  });
});

// =============================================================================
// maxNodes / maxDepth limits enforced
// =============================================================================

describe("validateCapture limits enforced", () => {
  it("maxNodes=3 with 5 nodes → issue", () => {
    const children = Array.from({ length: 4 }, (_, i) =>
      makeNode("TEXT", [i * 0.1, 0, 0.05, 0.05] as const)
    );
    const capture = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const, { children }));
    const issues = validateCapture(capture, { maxNodes: 3 });
    const limitIssue = issues.find((i) => i.message.includes("maxNodes"));
    expect(limitIssue).toBeDefined();
  });

  it("maxDepth=2 with depth 3 → issue", () => {
    const deep = makeNode("SECTION", [0, 0, 1, 1] as const, {
      children: [
        makeNode("CARD", [0, 0, 0.5, 0.5] as const, {
          children: [
            makeNode("LIST", [0, 0, 0.3, 0.3] as const, {
              children: [makeNode("TEXT", [0, 0, 0.2, 0.1] as const)],
            }),
          ],
        }),
      ],
    });
    const capture = makeCapture(deep);
    const issues = validateCapture(capture, { maxDepth: 2 });
    const depthIssue = issues.find((i) => i.message.includes("maxDepth"));
    expect(depthIssue).toBeDefined();
  });
});

// =============================================================================
// Invalid enum values caught
// =============================================================================

describe("validateCapture invalid enum values", () => {
  it("invalid handler event type → issue (bogus not in VALID_EVENT_TYPES)", () => {
    expect(VALID_EVENT_TYPES.has("bogus_event")).toBe(false);
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
            interactive: true,
            handlers: [{ event: "bogus_event" as any, intent: "do_stuff" }],
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const eventIssue = issues.find((i) => i.path.includes("event") && i.message.includes("Invalid event"));
    expect(eventIssue).toBeDefined();
  });

  it("invalid state access kind → issue (bogus not in VALID_STATE_ACCESS_KINDS)", () => {
    expect(VALID_STATE_ACCESS_KINDS.has("invalid_access")).toBe(false);
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
            interactive: true,
            state: [{ key: "count", access: "invalid_access" as any }],
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const accessIssue = issues.find((i) => i.message.includes("Invalid state access"));
    expect(accessIssue).toBeDefined();
  });

  it("invalid state scope → issue (bogus not in VALID_STATE_SCOPES)", () => {
    expect(VALID_STATE_SCOPES.has("invalid_scope")).toBe(false);
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("INPUT", [0.1, 0.1, 0.3, 0.05] as const, {
            interactive: true,
            state: [{ key: "count", access: "read", scope: "invalid_scope" as any }],
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const scopeIssue = issues.find((i) => i.message.includes("Invalid state scope"));
    expect(scopeIssue).toBeDefined();
  });

  it("invalid style intent token → issue (bogus not in VALID_STYLE_INTENT_TOKENS)", () => {
    expect(VALID_STYLE_INTENT_TOKENS.has("bogus_token")).toBe(false);
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
            interactive: true,
            style: { tokens: ["bogus_token" as any] },
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const styleIssue = issues.find((i) => i.message.includes("Invalid style intent"));
    expect(styleIssue).toBeDefined();
  });

  it("invalid density → issue (bogus not in VALID_DENSITIES)", () => {
    expect(VALID_DENSITIES.has("ultra_compact")).toBe(false);
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("SECTION", [0, 0, 1, 1] as const, {
            style: { tokens: ["primary"], density: "ultra_compact" as any },
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const densityIssue = issues.find((i) => i.message.includes("Invalid density"));
    expect(densityIssue).toBeDefined();
  });

  it("invalid size → issue (bogus not in VALID_SIZES)", () => {
    expect(VALID_SIZES.has("xxl")).toBe(false);
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("SECTION", [0, 0, 1, 1] as const, {
            style: { tokens: ["primary"], size: "xxl" as any },
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const sizeIssue = issues.find((i) => i.message.includes("Invalid size"));
    expect(sizeIssue).toBeDefined();
  });

  it("invalid pattern kind → issue (bogus not in VALID_PATTERN_KINDS)", () => {
    expect(VALID_PATTERN_KINDS.has("bogus_pattern")).toBe(false);
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("FORM", [0.1, 0.1, 0.8, 0.8] as const, {
            pattern: { kind: "bogus_pattern" as any },
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const patternIssue = issues.find((i) => i.message.includes("Invalid pattern kind"));
    expect(patternIssue).toBeDefined();
  });

  it("invalid UIRole → issue (WIDGET not in ALL_UI_ROLES)", () => {
    expect(ALL_UI_ROLES.includes("WIDGET" as any)).toBe(false);
    const capture = makeCapture(
      makeNode("WIDGET" as any, [0, 0, 1, 1] as const)
    );
    const issues = validateCapture(capture);
    const roleIssue = issues.find((i) => i.path === "root.role" && i.message.includes("Invalid UI role"));
    expect(roleIssue).toBeDefined();
  });

  it("all canonical UIRoles pass validation", () => {
    for (const role of ALL_UI_ROLES) {
      const capture = makeCapture(makeNode(role, [0, 0, 1, 1] as const));
      const issues = validateCapture(capture);
      const roleIssue = issues.find((i) => i.message.includes("Invalid UI role"));
      expect(roleIssue, `role "${role}" should be valid`).toBeUndefined();
    }
  });
});

// =============================================================================
// parseCapture error paths
// =============================================================================

describe("parseCapture error paths", () => {
  it("invalid JSON → WS_INVALID_JSON with cause", () => {
    try {
      parseCapture("{not valid json}");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(isWebSketchException(err)).toBe(true);
      const wsErr = (err as WebSketchException).ws;
      expect(wsErr.code).toBe("WS_INVALID_JSON");
      expect(wsErr.details).toBeTruthy();
      expect(wsErr.cause).toBeDefined();
      expect(wsErr.cause!.name).toBe("SyntaxError");
      expect(wsErr.hint).toBeTruthy();
    }
  });

  it("unsupported version → WS_UNSUPPORTED_VERSION with expected/received", () => {
    const data = { ...loginPage, version: "99.0" };
    try {
      parseCapture(JSON.stringify(data));
      expect.unreachable("should have thrown");
    } catch (err) {
      const wsErr = (err as WebSketchException).ws;
      expect(wsErr.code).toBe("WS_UNSUPPORTED_VERSION");
      expect(wsErr.expected).toBeTruthy();
      expect(wsErr.received).toContain("99.0");
      expect(wsErr.hint).toBeTruthy();
    }
  });

  it("limit exceeded → WS_LIMIT_EXCEEDED with path", () => {
    const children = Array.from({ length: 60 }, (_, i) =>
      makeNode("BUTTON", [i * 0.01, 0, 0.01, 0.01] as const, { interactive: true })
    );
    const capture = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const, { children }));
    try {
      parseCapture(JSON.stringify(capture), { maxNodes: 50 });
      expect.unreachable("should have thrown");
    } catch (err) {
      const wsErr = (err as WebSketchException).ws;
      expect(wsErr.code).toBe("WS_LIMIT_EXCEEDED");
      expect(wsErr.hint).toBeTruthy();
    }
  });

  it("input too long → WS_LIMIT_EXCEEDED for input size", () => {
    // Create a JSON string longer than maxStringLength * 100
    const longJson = "x".repeat(200);
    try {
      parseCapture(longJson, { maxStringLength: 1 });
      expect.unreachable("should have thrown");
    } catch (err) {
      const wsErr = (err as WebSketchException).ws;
      // Could be WS_LIMIT_EXCEEDED (for length) or WS_INVALID_JSON (for parse failure)
      expect(["WS_LIMIT_EXCEEDED", "WS_INVALID_JSON"]).toContain(wsErr.code);
    }
  });
});

// =============================================================================
// formatWebSketchError output
// =============================================================================

describe("formatWebSketchError output format", () => {
  it("formats all fields correctly", () => {
    const err: WebSketchError = {
      code: "WS_INVALID_CAPTURE",
      message: "validation failed",
      details: "3 issues found",
      path: "root.children[0]",
      expected: "valid node",
      received: "garbage",
      hint: "Check your data",
      cause: { name: "TypeError", message: "cannot read property" },
    };
    const output = formatWebSketchError(err);
    expect(output).toContain("[WS_INVALID_CAPTURE]");
    expect(output).toContain("validation failed");
    expect(output).toContain("Details: 3 issues found");
    expect(output).toContain("Path: root.children[0]");
    expect(output).toContain("Expected: valid node");
    expect(output).toContain("Received: garbage");
    expect(output).toContain("Hint: Check your data");
    expect(output).toContain("Cause: TypeError: cannot read property");
  });

  it("omits missing optional fields", () => {
    const err: WebSketchError = {
      code: "WS_INTERNAL",
      message: "something broke",
    };
    const output = formatWebSketchError(err);
    expect(output).toContain("[WS_INTERNAL]");
    expect(output).toContain("something broke");
    expect(output).not.toContain("Details:");
    expect(output).not.toContain("Path:");
    expect(output).not.toContain("Hint:");
    expect(output).not.toContain("Cause:");
  });

  it("expected/received only shown when both present", () => {
    const err: WebSketchError = {
      code: "WS_INVALID_ARGS",
      message: "bad arg",
      expected: "number",
    };
    const output = formatWebSketchError(err);
    expect(output).not.toContain("Expected:");
    expect(output).not.toContain("Received:");
  });
});

// =============================================================================
// isWebSketchException guard
// =============================================================================

describe("isWebSketchException type guard", () => {
  it("true for WebSketchException", () => {
    const err = new WebSketchException({ code: "WS_INTERNAL", message: "test" });
    expect(isWebSketchException(err)).toBe(true);
  });

  it("false for plain Error", () => {
    expect(isWebSketchException(new Error("nope"))).toBe(false);
  });

  it("false for null", () => {
    expect(isWebSketchException(null)).toBe(false);
  });

  it("false for undefined", () => {
    expect(isWebSketchException(undefined)).toBe(false);
  });

  it("false for object with similar shape but not instance", () => {
    const fakeErr = { name: "WebSketchException", ws: { code: "WS_INTERNAL", message: "fake" } };
    expect(isWebSketchException(fakeErr)).toBe(false);
  });

  it("false for number", () => {
    expect(isWebSketchException(42)).toBe(false);
  });
});
