/**
 * Test fixture helpers for WebSketch IR.
 *
 * Provides factory functions for building valid captures and nodes
 * with sensible defaults. All timestamps and metadata are fixed
 * (no Date.now() or Math.random()) so tests are deterministic.
 */

import type { WebSketchCapture, UINode, TextSignal, BBox01 } from "../../src/index.js";

/**
 * Build a minimal valid WebSketchCapture.
 * Defaults can be overridden for specific test cases.
 */
export function makeCapture(
  root: UINode,
  overrides?: Partial<Omit<WebSketchCapture, "root">>
): WebSketchCapture {
  return {
    version: "0.1",
    url: "https://example.com",
    timestamp_ms: 1700000000000,
    viewport: { w_px: 1920, h_px: 1080, aspect: 1920 / 1080 },
    compiler: { name: "websketch-ir", version: "0.2.1", options_hash: "test" },
    root,
    ...overrides,
  };
}

/**
 * Build a minimal valid UINode.
 * All optional fields default to sensible values.
 */
export function makeNode(
  role: UINode["role"],
  bbox: BBox01,
  overrides?: Partial<UINode>
): UINode {
  return {
    id: "",
    role,
    bbox,
    interactive: false,
    visible: true,
    ...overrides,
  };
}

/**
 * Build a TextSignal with defaults.
 */
export function makeText(
  kind: TextSignal["kind"],
  overrides?: Partial<TextSignal>
): TextSignal {
  return { kind, ...overrides };
}
