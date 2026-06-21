/**
 * WebSketch IR v0.1 - JSON Renderer
 *
 * Produces a minimal JSON tree for LLM tool-calling consumption.
 * Strips internal fields (id, hash, flags, z, visible, enabled, focusable)
 * and keeps only what an LLM needs to understand and act on a page.
 *
 * Output shape per node:
 * ```json
 * { "role": "BUTTON", "bbox": [0.1, 0.2, 0.3, 0.04], "text": "Submit", "children": [...] }
 * ```
 *
 * @module render/json
 */

import type {
  UINode,
  WebSketchCapture,
  HandlerSignal,
  BindingSignal,
  StateSignal,
} from "../grammar.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for the JSON renderer.
 */
export interface RenderJSONOptions {
  /** Include handler signals in output (default: false) */
  includeHandlers?: boolean;
  /** Include binding signals in output (default: false) */
  includeBindings?: boolean;
  /** Include state signals in output (default: false) */
  includeState?: boolean;
  /** Maximum tree depth to render; deeper nodes are omitted (default: 50, matching the validator's depth cap) */
  maxDepth?: number;
}

/**
 * Minimal JSON node shape for LLM consumption.
 */
export interface JSONNode {
  role: string;
  bbox: readonly [number, number, number, number];
  semantic?: string;
  text?: string;
  interactive?: true;
  handlers?: { event: string; intent: string; target?: string }[];
  bindings?: { property: string; expression: string }[];
  state?: { key: string; access: string; scope?: string }[];
  children?: JSONNode[];
}

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_OPTIONS: Required<RenderJSONOptions> = {
  includeHandlers: false,
  includeBindings: false,
  includeState: false,
  maxDepth: 50,
};

// =============================================================================
// Internal
// =============================================================================

/**
 * Convert a UINode to a minimal JSON-serializable object.
 */
function nodeToJSON(
  node: UINode,
  depth: number,
  opts: Required<RenderJSONOptions>,
): JSONNode | null {
  if (depth > opts.maxDepth) return null;

  const out: JSONNode = {
    role: node.role,
    bbox: node.bbox,
  };

  // Semantic hint
  if (node.semantic) {
    out.semantic = node.semantic;
  }

  // Text — expose kind and length as a compact string so the LLM
  // knows there is text content without needing the actual hash.
  if (node.text && node.text.kind !== "none") {
    const len = node.text.len ?? 0;
    out.text = len > 0 ? `${node.text.kind}(${len})` : node.text.kind;
  }

  // Interactive flag (only when true to keep output small)
  if (node.interactive) {
    out.interactive = true;
  }

  // Optional enrichments
  if (opts.includeHandlers && node.handlers && node.handlers.length > 0) {
    out.handlers = node.handlers.map((h: HandlerSignal) => {
      const entry: { event: string; intent: string; target?: string } = {
        event: h.event,
        intent: h.intent,
      };
      if (h.target) entry.target = h.target;
      return entry;
    });
  }

  if (opts.includeBindings && node.bindings && node.bindings.length > 0) {
    out.bindings = node.bindings.map((b: BindingSignal) => ({
      property: b.property,
      expression: b.expression,
    }));
  }

  if (opts.includeState && node.state && node.state.length > 0) {
    out.state = node.state.map((s: StateSignal) => {
      const entry: { key: string; access: string; scope?: string } = {
        key: s.key,
        access: s.access,
      };
      if (s.scope) entry.scope = s.scope;
      return entry;
    });
  }

  // Children (recurse)
  if (node.children && node.children.length > 0) {
    const kids: JSONNode[] = [];
    for (const child of node.children) {
      const rendered = nodeToJSON(child, depth + 1, opts);
      if (rendered) kids.push(rendered);
    }
    if (kids.length > 0) {
      out.children = kids;
    }
  }

  return out;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a WebSketchCapture as a minimal JSON tree string for LLM
 * tool-calling consumption.
 *
 * Strips internal fields (id, hash, flags, z, visible, enabled, focusable)
 * and keeps only role, bbox, semantic, text shape, interactivity, and
 * optionally handlers/bindings/state.
 *
 * @param capture - The capture to render.
 * @param options - Rendering options.
 * @returns A JSON string of the minimal tree.
 *
 * @example
 * ```ts
 * const json = renderJSON(capture);
 * // '{"role":"PAGE","bbox":[0,0,1,1],"children":[...]}'
 *
 * const rich = renderJSON(capture, { includeHandlers: true, maxDepth: 3 });
 * ```
 */
export function renderJSON(
  capture: WebSketchCapture,
  options?: RenderJSONOptions,
): string {
  const opts: Required<RenderJSONOptions> = { ...DEFAULT_OPTIONS, ...options };
  const tree = nodeToJSON(capture.root, 0, opts);
  return JSON.stringify(tree);
}
