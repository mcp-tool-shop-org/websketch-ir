/**
 * Stage A health-pass regression tests.
 *
 * Each test pins a verified Stage A defect fix so it cannot silently
 * regress. Grouped by the original finding id.
 */

import { describe, it, expect } from "vitest";
import {
  emitHTML,
  parseCapture,
  createTextSignal,
  createTextSignalSync,
  validateCapture,
  createCapture,
  WebSketchException,
} from "../src/index.js";
import { renderMarkdown } from "../src/render/markdown.js";
import { makeCapture, makeNode } from "./fixtures/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// hash-text-diff-001 (HIGH): sync and async text signals must agree
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: text signal hash unification", () => {
  it("createTextSignal (async) and createTextSignalSync produce the SAME hash", async () => {
    const text = "Log in to your account";
    const asyncSig = await createTextSignal(text);
    const syncSig = createTextSignalSync(text);
    expect(asyncSig.hash).toBe(syncSig.hash);
  });

  it("both paths emit a 16-char FNV-1a hex hash (not 64-char SHA-256)", async () => {
    const asyncSig = await createTextSignal("some content");
    const syncSig = createTextSignalSync("some content");
    expect(asyncSig.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(syncSig.hash).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// errors-validation-001 (HIGH): documented input-size limits are enforced
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: parseCapture enforces input-size limits", () => {
  const validJson = JSON.stringify(makeCapture(makeNode("PAGE", [0, 0, 1, 1])));

  function codeOf(fn: () => unknown): string | undefined {
    try {
      fn();
    } catch (err) {
      return err instanceof WebSketchException ? err.ws.code : "OTHER";
    }
    return undefined;
  }

  it("rejects input exceeding maxInputChars with WS_LIMIT_EXCEEDED", () => {
    expect(codeOf(() => parseCapture(validJson, { maxInputChars: 5 }))).toBe("WS_LIMIT_EXCEEDED");
  });

  it("rejects input exceeding maxInputLines (line count is now actually checked)", () => {
    const manyLines = validJson + "\n".repeat(100);
    expect(codeOf(() => parseCapture(manyLines, { maxInputLines: 10 }))).toBe("WS_LIMIT_EXCEEDED");
  });

  it("rejects input exceeding maxInputBytes (byte budget is now actually checked)", () => {
    expect(codeOf(() => parseCapture(validJson, { maxInputBytes: 5 }))).toBe("WS_LIMIT_EXCEEDED");
  });

  it("accepts a normal capture under the default limits", () => {
    expect(() => parseCapture(validJson)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// render-codegen-001 (HIGH): HTML attribute-name injection is neutralized
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: emitHTML attribute-name injection is sanitized", () => {
  it("a malicious binding property cannot inject a new attribute / event handler", () => {
    const node = makeNode("INPUT", [0, 0, 0.5, 0.1], {
      bindings: [{ property: 'x" onload="alert(1)', expression: "state.x" }],
    });
    const html = emitHTML(makeCapture(node), { includeBindings: true });

    // No attribute breakout: the raw injected handler must not appear.
    expect(html).not.toContain('onload="alert(1)"');
    expect(html).not.toContain('" onload=');
    // Every emitted data-wsk-bind key is restricted to the allowlist charset.
    const bindKeys = [...html.matchAll(/data-wsk-bind-([^\s=]*)=/g)].map((m) => m[1]);
    expect(bindKeys.length).toBeGreaterThan(0);
    for (const k of bindKeys) {
      expect(k).toMatch(/^[a-zA-Z0-9_-]*$/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// render-codegen-002 (MEDIUM): markdown injection via `semantic` is escaped
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: renderMarkdown escapes injection in semantic labels", () => {
  it("escapes pipes and link brackets so structure/links cannot be injected", () => {
    const node = makeNode("TEXT", [0, 0, 1, 0.1], {
      semantic: "a|b [x](http://evil)",
      text: { kind: "short", len: 18, hash: "0000000000000000" },
    });
    const md = renderMarkdown(makeCapture(node));
    // The raw unescaped payload must not survive verbatim.
    expect(md).not.toContain("a|b [x](http://evil)");
    // Markdown-significant characters are backslash-escaped.
    expect(md).toContain("\\|");
    expect(md).toContain("\\[");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// errors-validation-002 (MEDIUM): 100-issue cap holds for flat array fan-out
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: validation issue cap bounds flat fan-out", () => {
  it("caps collected issues even for a huge invalid handlers array", () => {
    const badHandlers = Array.from({ length: 600 }, () => ({
      event: "NOT_A_REAL_EVENT",
      intent: 123, // not a string
    }));
    const node = makeNode("BUTTON", [0, 0, 0.1, 0.1], {
      handlers: badHandlers as unknown as UINodeHandlers,
    });
    const issues = validateCapture(makeCapture(node));
    // Without the cap this would be ~1200 issues; the cap bounds it near 100.
    expect(issues.length).toBeLessThanOrEqual(120);
    expect(issues.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// core-grammar-001 (MEDIUM): createCapture stamps the live library version
// ─────────────────────────────────────────────────────────────────────────────
describe("regression: createCapture compiler version is not a stale literal", () => {
  it("stamps a real semver version, not the hardcoded 2.0.1", () => {
    const cap = createCapture(makeNode("PAGE", [0, 0, 1, 1]), { timestamp_ms: 1700000000000 });
    expect(cap.compiler.version).not.toBe("2.0.1");
    expect(cap.compiler.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// Local helper type alias to keep the cast above readable without importing
// the internal HandlerSignal[] shape.
type UINodeHandlers = NonNullable<ReturnType<typeof makeNode>["handlers"]>;
