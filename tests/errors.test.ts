import { describe, it, expect } from "vitest";
import {
  validateCapture,
  parseCapture,
  formatWebSketchError,
  isWebSketchException,
  WebSketchException,
  DEFAULT_LIMITS,
  type WebSketchError,
  type WebSketchValidationError,
} from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { loginPage, minimal } from "./fixtures/captures.js";

// =============================================================================
// validateCapture — valid captures
// =============================================================================

describe("validateCapture valid captures", () => {
  it("loginPage has zero issues", () => {
    const issues = validateCapture(loginPage);
    expect(issues).toHaveLength(0);
  });

  it("minimal capture has zero issues", () => {
    const issues = validateCapture(minimal);
    expect(issues).toHaveLength(0);
  });
});

// =============================================================================
// validateCapture — top-level fields
// =============================================================================

describe("validateCapture top-level fields", () => {
  it("non-object input → issue", () => {
    const issues = validateCapture("not an object");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].path).toBe("");
    expect(issues[0].expected).toContain("object");
  });

  it("null input → issue", () => {
    const issues = validateCapture(null);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("array input → issue", () => {
    const issues = validateCapture([]);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("missing version → issue", () => {
    const issues = validateCapture({});
    const versionIssue = issues.find((i) => i.path === "version");
    expect(versionIssue).toBeDefined();
  });

  it("wrong version → issue", () => {
    const issues = validateCapture({ version: "99.0" });
    const versionIssue = issues.find((i) => i.path === "version");
    expect(versionIssue).toBeDefined();
    expect(versionIssue!.received).toContain("99.0");
  });

  it("missing url → issue", () => {
    const issues = validateCapture({ version: "0.1" });
    const urlIssue = issues.find((i) => i.path === "url");
    expect(urlIssue).toBeDefined();
  });

  it("missing timestamp_ms → issue", () => {
    const issues = validateCapture({ version: "0.1", url: "http://x.com" });
    const tsIssue = issues.find((i) => i.path === "timestamp_ms");
    expect(tsIssue).toBeDefined();
  });

  it("missing viewport → issue", () => {
    const issues = validateCapture({ version: "0.1", url: "http://x.com", timestamp_ms: 1 });
    const vpIssue = issues.find((i) => i.path === "viewport");
    expect(vpIssue).toBeDefined();
  });

  it("viewport missing w_px → issue", () => {
    const issues = validateCapture({
      version: "0.1", url: "http://x.com", timestamp_ms: 1,
      viewport: { h_px: 1080, aspect: 1.78 },
    });
    const vpIssue = issues.find((i) => i.path === "viewport.w_px");
    expect(vpIssue).toBeDefined();
  });

  it("missing compiler → issue", () => {
    const issues = validateCapture({
      version: "0.1", url: "http://x.com", timestamp_ms: 1,
      viewport: { w_px: 1920, h_px: 1080, aspect: 1.78 },
    });
    const compIssue = issues.find((i) => i.path === "compiler");
    expect(compIssue).toBeDefined();
  });

  it("missing root → issue", () => {
    const issues = validateCapture({
      version: "0.1", url: "http://x.com", timestamp_ms: 1,
      viewport: { w_px: 1920, h_px: 1080, aspect: 1.78 },
      compiler: { name: "websketch-ir", version: "0.2.1", options_hash: "test" },
    });
    const rootIssue = issues.find((i) => i.path === "root");
    expect(rootIssue).toBeDefined();
  });
});

// =============================================================================
// validateCapture — node validation
// =============================================================================

describe("validateCapture node validation", () => {
  it("invalid role → issue with path", () => {
    const capture = makeCapture(
      makeNode("BOGUS" as any, [0, 0, 1, 1] as const)
    );
    const issues = validateCapture(capture);
    const roleIssue = issues.find((i) => i.path === "root.role");
    expect(roleIssue).toBeDefined();
    expect(roleIssue!.received).toContain("BOGUS");
  });

  it("invalid bbox (3 elements) → issue", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", bbox: [0, 0, 1] as any, interactive: false, visible: true,
    });
    const issues = validateCapture(capture);
    const bboxIssue = issues.find((i) => i.path === "root.bbox");
    expect(bboxIssue).toBeDefined();
  });

  it("bbox with non-number → issue", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", bbox: [0, 0, "bad", 1] as any, interactive: false, visible: true,
    });
    const issues = validateCapture(capture);
    const bboxIssue = issues.find((i) => i.path.startsWith("root.bbox["));
    expect(bboxIssue).toBeDefined();
  });

  it("missing interactive → issue", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", bbox: [0, 0, 1, 1] as any, visible: true,
    } as any);
    const issues = validateCapture(capture);
    const interIssue = issues.find((i) => i.path === "root.interactive");
    expect(interIssue).toBeDefined();
  });

  it("missing visible → issue", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", bbox: [0, 0, 1, 1] as any, interactive: false,
    } as any);
    const issues = validateCapture(capture);
    const visIssue = issues.find((i) => i.path === "root.visible");
    expect(visIssue).toBeDefined();
  });

  it("missing id → issue", () => {
    const capture = makeCapture({
      role: "PAGE", bbox: [0, 0, 1, 1] as any, interactive: false, visible: true,
    } as any);
    const issues = validateCapture(capture);
    const idIssue = issues.find((i) => i.path === "root.id");
    expect(idIssue).toBeDefined();
  });

  it("invalid children (not array) → issue", () => {
    const capture = makeCapture({
      id: "", role: "PAGE", bbox: [0, 0, 1, 1], interactive: false, visible: true,
      children: "not-array",
    } as any);
    const issues = validateCapture(capture);
    const childIssue = issues.find((i) => i.path === "root.children");
    expect(childIssue).toBeDefined();
  });

  it("nested child issue includes correct path", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("SECTION", [0, 0, 0.5, 0.5] as const, {
            children: [
              { id: "", role: "INVALID_DEEP" as any, bbox: [0, 0, 0.1, 0.1], interactive: false, visible: true },
            ],
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const deepIssue = issues.find((i) => i.path === "root.children[0].children[0].role");
    expect(deepIssue).toBeDefined();
  });

  it("text without kind → issue", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("TEXT", [0, 0, 1, 0.1] as const, {
            text: { len: 5 } as any,
          }),
        ],
      })
    );
    const issues = validateCapture(capture);
    const textIssue = issues.find((i) => i.path.includes("text.kind"));
    expect(textIssue).toBeDefined();
  });
});

// =============================================================================
// validateCapture — limits
// =============================================================================

describe("validateCapture limits", () => {
  it("maxNodes exceeded → issue", () => {
    // Build a capture with many children
    const children = Array.from({ length: 60 }, (_, i) =>
      makeNode("BUTTON", [i * 0.01, 0, 0.01, 0.01] as const, { interactive: true })
    );
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, { children })
    );
    const issues = validateCapture(capture, { maxNodes: 50 });
    const limitIssue = issues.find((i) => i.message.includes("maxNodes"));
    expect(limitIssue).toBeDefined();
  });

  it("maxDepth exceeded → issue", () => {
    // Build a deeply nested capture
    let node = makeNode("TEXT", [0, 0, 0.1, 0.1] as const);
    for (let i = 0; i < 10; i++) {
      node = makeNode("SECTION", [0, 0, 1, 1] as const, { children: [node] });
    }
    const capture = makeCapture(node);
    const issues = validateCapture(capture, { maxDepth: 3 });
    const limitIssue = issues.find((i) => i.message.includes("maxDepth"));
    expect(limitIssue).toBeDefined();
  });

  it("DEFAULT_LIMITS has expected defaults", () => {
    expect(DEFAULT_LIMITS.maxNodes).toBe(10_000);
    expect(DEFAULT_LIMITS.maxDepth).toBe(50);
    expect(DEFAULT_LIMITS.maxStringLength).toBe(10_000);
  });
});

// =============================================================================
// parseCapture
// =============================================================================

describe("parseCapture", () => {
  it("valid JSON → returns WebSketchCapture", () => {
    const result = parseCapture(JSON.stringify(loginPage));
    expect(result.version).toBe("0.1");
    expect(result.root.role).toBe("PAGE");
  });

  it("round-trips loginPage", () => {
    const result = parseCapture(JSON.stringify(loginPage));
    expect(result).toEqual(loginPage);
  });

  it("invalid JSON → throws WS_INVALID_JSON", () => {
    expect(() => parseCapture("not json")).toThrow(WebSketchException);
    try {
      parseCapture("not json");
    } catch (err) {
      expect(isWebSketchException(err)).toBe(true);
      expect((err as WebSketchException).ws.code).toBe("WS_INVALID_JSON");
    }
  });

  it("unsupported version → throws WS_UNSUPPORTED_VERSION", () => {
    const data = { ...loginPage, version: "99.0" };
    expect(() => parseCapture(JSON.stringify(data))).toThrow(WebSketchException);
    try {
      parseCapture(JSON.stringify(data));
    } catch (err) {
      expect((err as WebSketchException).ws.code).toBe("WS_UNSUPPORTED_VERSION");
    }
  });

  it("missing root → throws WS_INVALID_CAPTURE", () => {
    const data = {
      version: "0.1", url: "http://x.com", timestamp_ms: 1,
      viewport: { w_px: 1920, h_px: 1080, aspect: 1.78 },
      compiler: { name: "websketch-ir", version: "0.2.1", options_hash: "test" },
    };
    expect(() => parseCapture(JSON.stringify(data))).toThrow(WebSketchException);
    try {
      parseCapture(JSON.stringify(data));
    } catch (err) {
      expect((err as WebSketchException).ws.code).toBe("WS_INVALID_CAPTURE");
      const wsErr = (err as WebSketchException).ws as WebSketchValidationError;
      expect(wsErr.issues).toBeDefined();
      expect(wsErr.issues.length).toBeGreaterThan(0);
    }
  });

  it("limit exceeded → throws WS_LIMIT_EXCEEDED", () => {
    const children = Array.from({ length: 60 }, (_, i) =>
      makeNode("BUTTON", [i * 0.01, 0, 0.01, 0.01] as const, { interactive: true })
    );
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, { children })
    );
    expect(() => parseCapture(JSON.stringify(capture), { maxNodes: 50 })).toThrow(WebSketchException);
    try {
      parseCapture(JSON.stringify(capture), { maxNodes: 50 });
    } catch (err) {
      expect((err as WebSketchException).ws.code).toBe("WS_LIMIT_EXCEEDED");
    }
  });
});

// =============================================================================
// WebSketchException
// =============================================================================

describe("WebSketchException", () => {
  it("has name 'WebSketchException'", () => {
    const err = new WebSketchException({
      code: "WS_INTERNAL",
      message: "test error",
    });
    expect(err.name).toBe("WebSketchException");
  });

  it("has ws property with error payload", () => {
    const ws: WebSketchError = {
      code: "WS_INVALID_JSON",
      message: "bad json",
      hint: "check your JSON",
    };
    const err = new WebSketchException(ws);
    expect(err.ws).toBe(ws);
    expect(err.ws.code).toBe("WS_INVALID_JSON");
    expect(err.ws.hint).toBe("check your JSON");
  });

  it("message matches ws.message", () => {
    const err = new WebSketchException({
      code: "WS_INTERNAL",
      message: "something broke",
    });
    expect(err.message).toBe("something broke");
  });

  it("cause chain works", () => {
    const err = new WebSketchException({
      code: "WS_IO_ERROR",
      message: "read failed",
      cause: { name: "Error", message: "ENOENT" },
    });
    expect(err.cause).toBeInstanceOf(Error);
    expect((err.cause as Error).message).toBe("ENOENT");
  });

  it("instanceof Error", () => {
    const err = new WebSketchException({
      code: "WS_INTERNAL",
      message: "test",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WebSketchException);
  });
});

// =============================================================================
// isWebSketchException
// =============================================================================

describe("isWebSketchException", () => {
  it("true for WebSketchException", () => {
    const err = new WebSketchException({
      code: "WS_INTERNAL",
      message: "test",
    });
    expect(isWebSketchException(err)).toBe(true);
  });

  it("false for plain Error", () => {
    expect(isWebSketchException(new Error("nope"))).toBe(false);
  });

  it("false for string", () => {
    expect(isWebSketchException("not an error")).toBe(false);
  });

  it("false for null", () => {
    expect(isWebSketchException(null)).toBe(false);
  });
});

// =============================================================================
// formatWebSketchError
// =============================================================================

describe("formatWebSketchError", () => {
  it("includes code and message", () => {
    const output = formatWebSketchError({
      code: "WS_INVALID_JSON",
      message: "bad json",
    });
    expect(output).toContain("[WS_INVALID_JSON]");
    expect(output).toContain("bad json");
  });

  it("includes details when present", () => {
    const output = formatWebSketchError({
      code: "WS_INVALID_JSON",
      message: "bad json",
      details: "Unexpected token",
    });
    expect(output).toContain("Unexpected token");
  });

  it("includes hint when present", () => {
    const output = formatWebSketchError({
      code: "WS_INVALID_JSON",
      message: "bad json",
      hint: "Check your JSON syntax",
    });
    expect(output).toContain("Check your JSON syntax");
  });

  it("includes expected/received when present", () => {
    const output = formatWebSketchError({
      code: "WS_UNSUPPORTED_VERSION",
      message: "bad version",
      expected: '"0.1"',
      received: '"99.0"',
    });
    expect(output).toContain('"0.1"');
    expect(output).toContain('"99.0"');
  });

  it("includes path when present", () => {
    const output = formatWebSketchError({
      code: "WS_NOT_FOUND",
      message: "missing file",
      path: "/foo/bar.json",
    });
    expect(output).toContain("/foo/bar.json");
  });

  it("includes cause when present", () => {
    const output = formatWebSketchError({
      code: "WS_IO_ERROR",
      message: "read failed",
      cause: { name: "Error", message: "ENOENT" },
    });
    expect(output).toContain("ENOENT");
  });
});
