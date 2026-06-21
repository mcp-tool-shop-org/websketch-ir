import { describe, it, expect } from "vitest";
import {
  validateCapture,
  diff,
  formatDiff,
  emitHTML,
  emitNodeHTML,
  renderAscii,
  renderForLLM,
  fingerprintCapture,
  fingerprintLayout,
} from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { loginPage, loginPageModified } from "./fixtures/captures.js";

// =============================================================================
// Cross-module integration: parse → validate → diff → render
// =============================================================================

describe("integration round-trip", () => {
  it("validate → diff → render pipeline works end-to-end", () => {
    // Validate both captures
    const issuesA = validateCapture(loginPage);
    const issuesB = validateCapture(loginPageModified);
    expect(issuesA).toHaveLength(0);
    expect(issuesB).toHaveLength(0);

    // Diff them
    const result = diff(loginPage, loginPageModified);
    expect(result.changes.length).toBeGreaterThan(0);

    // Render both as ASCII
    const asciiA = renderAscii(loginPage);
    const asciiB = renderAscii(loginPageModified);
    expect(asciiA).toBeTruthy();
    expect(asciiB).toBeTruthy();
    expect(asciiA).not.toBe(asciiB);

    // Render both as HTML
    const htmlA = emitHTML(loginPage);
    const htmlB = emitHTML(loginPageModified);
    expect(htmlA).toBeTruthy();
    expect(htmlB).toBeTruthy();
    expect(htmlA).not.toBe(htmlB);
  });

  it("validate rejects malformed capture", () => {
    const bad = { version: "0.1", url: "http://test.com" } as any;
    const issues = validateCapture(bad);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("fingerprints are deterministic across runs", () => {
    const fp1 = fingerprintCapture(loginPage);
    const fp2 = fingerprintCapture(loginPage);
    expect(fp1).toBe(fp2);

    const layout1 = fingerprintLayout(loginPage);
    const layout2 = fingerprintLayout(loginPage);
    expect(layout1).toBe(layout2);
  });

  it("LLM render produces text output", () => {
    const llm = renderForLLM(loginPage);
    expect(llm).toBeTruthy();
    expect(typeof llm).toBe("string");
    expect(llm.length).toBeGreaterThan(0);
  });

  it("build → validate → diff → ASCII + HTML round-trip catches contract breaks", () => {
    // Step 1: Build two captures from scratch (not using golden fixtures)
    const captureA = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("NAV", [0, 0, 1, 0.08] as const, {
            children: [
              makeNode("LINK", [0.02, 0.01, 0.1, 0.06] as const, {
                interactive: true,
                semantic: "home",
              }),
            ],
          }),
          makeNode("FORM", [0.2, 0.15, 0.6, 0.6] as const, {
            pattern: { kind: "auth_form", variant: "login" },
            children: [
              makeNode("INPUT", [0.25, 0.2, 0.5, 0.06] as const, {
                interactive: true,
                semantic: "email",
                bindings: [{ property: "value", expression: "state.email" }],
                state: [{ key: "email", access: "readwrite", scope: "local" }],
              }),
              makeNode("BUTTON", [0.35, 0.5, 0.3, 0.08] as const, {
                interactive: true,
                semantic: "submit",
                handlers: [{ event: "click", intent: "submit_form" }],
                style: { tokens: ["primary", "elevated"] },
              }),
            ],
          }),
          makeNode("FOOTER", [0, 0.92, 1, 0.08] as const),
        ],
      })
    );

    const captureB = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("NAV", [0, 0, 1, 0.08] as const, {
            children: [
              makeNode("LINK", [0.02, 0.01, 0.1, 0.06] as const, {
                interactive: true,
                semantic: "home",
              }),
              // Added link
              makeNode("LINK", [0.15, 0.01, 0.1, 0.06] as const, {
                interactive: true,
                semantic: "signup",
              }),
            ],
          }),
          makeNode("FORM", [0.2, 0.15, 0.6, 0.65] as const, {
            // resized
            pattern: { kind: "auth_form", variant: "login" },
            children: [
              makeNode("INPUT", [0.25, 0.2, 0.5, 0.06] as const, {
                interactive: true,
                semantic: "email",
                bindings: [{ property: "value", expression: "state.email" }],
                state: [{ key: "email", access: "readwrite", scope: "local" }],
              }),
              // Added checkbox
              makeNode("CHECKBOX", [0.25, 0.38, 0.04, 0.04] as const, {
                interactive: true,
                semantic: "remember",
              }),
              makeNode("BUTTON", [0.35, 0.55, 0.3, 0.08] as const, {
                interactive: true,
                semantic: "submit",
                handlers: [{ event: "click", intent: "submit_form" }],
                style: { tokens: ["primary", "elevated"] },
              }),
            ],
          }),
          makeNode("FOOTER", [0, 0.92, 1, 0.08] as const),
        ],
      })
    );

    // Step 2: Validate both
    expect(validateCapture(captureA)).toHaveLength(0);
    expect(validateCapture(captureB)).toHaveLength(0);

    // Step 3: Diff
    const result = diff(captureA, captureB);
    expect(result.summary.identical).toBe(false);
    expect(result.summary.counts.added).toBeGreaterThan(0);
    const formatted = formatDiff(result);
    expect(formatted).toContain("WebSketch IR Diff Report");

    // Step 4: Render both as ASCII — no throws, non-empty, different
    const asciiA = renderAscii(captureA);
    const asciiB = renderAscii(captureB);
    expect(asciiA.length).toBeGreaterThan(0);
    expect(asciiB.length).toBeGreaterThan(0);
    expect(asciiA).not.toBe(asciiB);

    // Step 5: Render both as HTML — non-empty, contains expected tags, balanced
    const htmlA = emitHTML(captureA, { fullDocument: true });
    const htmlB = emitHTML(captureB, { fullDocument: true });
    expect(htmlA).toContain("<form");
    expect(htmlA).toContain("<input");
    expect(htmlB).toContain("<form");
    expect(htmlB).toContain("</html>");

    // Verify balanced tags in both HTML outputs
    const voidRe = /^(input|img|br|hr|meta|link|area|base|col|embed|source|track|wbr)$/i;
    for (const html of [htmlA, htmlB]) {
      const opens = (html.match(/<([a-z][a-z0-9]*)\b[^>]*(?<!\/)>/gi) ?? []).filter((tag) => {
        const name = tag.match(/^<([a-z][a-z0-9]*)/i)?.[1] ?? "";
        return !voidRe.test(name);
      });
      const closes = html.match(/<\/([a-z][a-z0-9]*)\s*>/gi) ?? [];
      expect(opens.length).toBe(closes.length);
    }
  });

  it("constructed capture validates and renders", () => {
    const capture = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("HEADER", [0, 0, 1, 0.1] as const, {
            children: [
              makeNode("TEXT", [0.1, 0.02, 0.5, 0.08] as const, {
                text: makeText("Hello World"),
              }),
            ],
          }),
          makeNode("SECTION", [0, 0.1, 1, 0.9] as const, {
            children: [
              makeNode("BUTTON", [0.3, 0.5, 0.7, 0.6] as const, {
                text: makeText("Click Me"),
              }),
            ],
          }),
        ],
      }),
    );

    const issues = validateCapture(capture);
    expect(issues).toHaveLength(0);

    const ascii = renderAscii(capture);
    expect(ascii.length).toBeGreaterThan(0);

    const html = emitHTML(capture);
    expect(html).toContain("<header");
    expect(html).toContain("<button");
  });
});
