/**
 * Feature Pass regression tests — the approved addressability + LLM-ergonomics
 * bundle (ships as 2.3.0). Each test pins a new public capability.
 */

import { describe, it, expect } from "vitest";
import {
  // core-api-002
  findById,
  getPath,
  getParent,
  findAncestor,
  queryWithin,
  // render-llm-001 / 002
  renderForLLM,
  renderJSON,
  renderJSONFlat,
  // core-api-004
  fingerprintCapture,
  fingerprintLayout,
  // core-api-005b
  assertValidCapture,
  WebSketchException,
  // diff-integration-001 / 002
  diff,
  formatDiffForLLM,
} from "../src/index.js";
import { makeCapture, makeNode } from "./fixtures/index.js";

// A small addressable tree: PAGE > [NAV, FORM > [INPUT, BUTTON]]
function tree() {
  const input = makeNode("INPUT", [0.1, 0.2, 0.3, 0.05], { id: "n-input", interactive: true, semantic: "email" });
  const button = makeNode("BUTTON", [0.1, 0.3, 0.2, 0.05], { id: "n-btn", interactive: true, semantic: "submit" });
  const form = makeNode("FORM", [0.05, 0.1, 0.5, 0.4], { id: "n-form", children: [input, button] });
  const nav = makeNode("NAV", [0, 0, 1, 0.08], { id: "n-nav" });
  const root = makeNode("PAGE", [0, 0, 1, 1], { id: "n-page", children: [nav, form] });
  return { root, nav, form, input, button };
}

// ─────────────────────────────────────────────────────────────────────────────
// core-api-002: addressability / containment
// ─────────────────────────────────────────────────────────────────────────────
describe("feature: id + containment resolution", () => {
  it("findById resolves an id back to its node", () => {
    const { root, button } = tree();
    expect(findById(root, "n-btn")).toBe(button);
    expect(findById(root, "does-not-exist")).toBeUndefined();
  });

  it("getPath returns the index path; [] for root, undefined for strangers", () => {
    const { root, button } = tree();
    expect(getPath(root, button)).toEqual([1, 1]); // FORM is child 1, BUTTON is child 1 of FORM
    expect(getPath(root, root)).toEqual([]);
    expect(getPath(root, makeNode("PAGE", [0, 0, 1, 1]))).toBeUndefined();
  });

  it("getParent returns the parent (undefined for root)", () => {
    const { root, form, button } = tree();
    expect(getParent(root, button)).toBe(form);
    expect(getParent(root, root)).toBeUndefined();
  });

  it("findAncestor walks up to the nearest matching ancestor", () => {
    const { root, form, input } = tree();
    expect(findAncestor(root, input, (n) => n.role === "FORM")).toBe(form);
    expect(findAncestor(root, input, (n) => n.role === "PAGE")).toBe(root);
  });

  it("queryWithin finds descendants of a container by role", () => {
    const { root, input } = tree();
    const inputsInForms = queryWithin(root, (n) => n.role === "FORM", "INPUT");
    expect(inputsInForms).toEqual([input]);
    expect(queryWithin(root, (n) => n.role === "NAV", "INPUT")).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// render-llm-001: renderForLLM options
// ─────────────────────────────────────────────────────────────────────────────
describe("feature: renderForLLM options", () => {
  const cap = () => makeCapture(tree().root);

  it("no-arg call is unchanged and includes metadata + legend", () => {
    const out = renderForLLM(cap());
    expect(out).toContain("https://example.com"); // metadata header
    expect(typeof out).toBe("string");
  });

  it("includeMetadata:false drops the header; includeLegend:false drops the legend", () => {
    const full = renderForLLM(cap());
    const noMeta = renderForLLM(cap(), { includeMetadata: false });
    const noLegend = renderForLLM(cap(), { includeLegend: false });
    expect(noMeta).not.toContain("https://example.com");
    expect(noLegend.length).toBeLessThan(full.length);
  });

  it("a custom grid size changes the output and does not throw", () => {
    expect(() => renderForLLM(cap(), { width: 40, height: 12 })).not.toThrow();
    expect(renderForLLM(cap(), { width: 40 })).not.toBe(renderForLLM(cap()));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// render-llm-002: addressable JSON + flat view
// ─────────────────────────────────────────────────────────────────────────────
describe("feature: addressable JSON for tool-calling", () => {
  it("renderJSON includePath adds deterministic path handles", () => {
    const json = JSON.parse(renderJSON(makeCapture(tree().root), { includePath: true })) as { path?: string };
    expect(json.path).toBe("PAGE");
  });

  it("renderJSONFlat returns a flat array of addressable interactive nodes", () => {
    const flat = renderJSONFlat(makeCapture(tree().root));
    expect(Array.isArray(flat)).toBe(true);
    const roles = flat.map((e) => e.role);
    expect(roles).toContain("BUTTON");
    expect(roles).toContain("INPUT");
    for (const entry of flat) {
      expect(typeof entry.path).toBe("string");
      expect(entry.path.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// core-api-004: HashOptions through fingerprints
// ─────────────────────────────────────────────────────────────────────────────
describe("feature: fingerprint HashOptions", () => {
  it("accepts options and stays a stable 16-char FNV hash", () => {
    const cap = makeCapture(tree().root);
    const fp = fingerprintCapture(cap, { includeState: false, includeHandlers: false });
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprintCapture(cap, { includeState: false })).toBe(fingerprintCapture(cap, { includeState: false }));
  });

  it("fingerprintLayout stays text-agnostic even if options try to enable text", () => {
    const cap = makeCapture(tree().root);
    // includeText:true must be overridden to false internally → layout fp unaffected by text
    expect(fingerprintLayout(cap, { includeText: true })).toBe(fingerprintLayout(cap));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// core-api-005b: assertValidCapture
// ─────────────────────────────────────────────────────────────────────────────
describe("feature: assertValidCapture (throwing in-memory validator)", () => {
  it("returns the capture when valid, throws WebSketchException when not", () => {
    const valid = makeCapture(tree().root);
    expect(assertValidCapture(valid)).toBe(valid);
    expect(() => assertValidCapture({ not: "a capture" })).toThrow(WebSketchException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// diff-integration-001/002: root export + change identity
// ─────────────────────────────────────────────────────────────────────────────
describe("feature: diff integration", () => {
  it("formatDiffForLLM is reachable from the package root", () => {
    expect(typeof formatDiffForLLM).toBe("function");
  });

  it("NodeChange carries a stable path/nodeId handle", () => {
    const a = makeCapture(tree().root);
    const moved = tree();
    moved.button.bbox = [0.5, 0.6, 0.2, 0.05]; // move the button
    const b = makeCapture(moved.root);
    const result = diff(a, b);
    const withPath = result.changes.filter((c) => typeof c.path === "string" && c.path.length > 0);
    expect(withPath.length).toBeGreaterThan(0);
  });
});
