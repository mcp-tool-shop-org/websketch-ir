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
  UIRole,
  BBox01,
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
  /**
   * Add a deterministic structural `path` to each node (default: false).
   * Uses the same scheme as the diff engine's flattened tree —
   * e.g. `"PAGE/NAV[0]/BUTTON[2]"` — so an LLM can address a node by
   * position and integrators can correlate JSON nodes with diff changes.
   */
  includePath?: boolean;
  /**
   * Add the node's stable `id` to each node (default: false).
   * Lets an LLM reference a node by its capture-stable identity handle.
   */
  includeId?: boolean;
}

/**
 * Minimal JSON node shape for LLM consumption.
 */
export interface JSONNode {
  role: string;
  bbox: readonly [number, number, number, number];
  /** Deterministic structural path (only present when `includePath`). */
  path?: string;
  /** Stable node identity handle (only present when `includeId`). */
  id?: string;
  semantic?: string;
  text?: string;
  interactive?: true;
  handlers?: { event: string; intent: string; target?: string }[];
  bindings?: { property: string; expression: string }[];
  state?: { key: string; access: string; scope?: string }[];
  children?: JSONNode[];
}

/**
 * A single flattened entry in {@link renderJSONFlat} output.
 *
 * Represents one actionable node (interactive, handler-bearing, or a known
 * actionable role) as a flat, addressable record — the natural shape for a
 * tool-call menu where each entry is something an LLM agent could act on.
 */
export interface RenderJSONFlatEntry {
  /** Deterministic structural path, e.g. `"PAGE/NAV[0]/BUTTON[2]"`. */
  path: string;
  /** The node's UI role. */
  role: UIRole;
  /** Bounding box in viewport-relative `[x, y, w, h]` coordinates. */
  bbox: BBox01;
  /** Compact text descriptor (`kind` or `kind(len)`), when the node has text. */
  text?: string;
  /** Whether the node can receive direct user interaction. */
  interactive: boolean;
  /** Event handlers attached to the node, when any are present. */
  handlers?: { event: string; intent: string; target?: string }[];
}

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_OPTIONS: Required<RenderJSONOptions> = {
  includeHandlers: false,
  includeBindings: false,
  includeState: false,
  maxDepth: 50,
  includePath: false,
  includeId: false,
};

/**
 * Roles that are inherently actionable even when the capture did not flag the
 * node `interactive` or attach explicit handlers — these are the affordances
 * an LLM agent is most likely to want in a tool-call menu.
 */
const ACTIONABLE_ROLES: ReadonlySet<UIRole> = new Set<UIRole>([
  "BUTTON",
  "LINK",
  "INPUT",
  "CHECKBOX",
  "RADIO",
  "ICON",
]);

// =============================================================================
// Internal
// =============================================================================

/**
 * Build the deterministic structural path for a child node, using the same
 * scheme as the diff engine's flattened tree (root = bare role, each child
 * suffixed with its index): `PAGE` → `PAGE/NAV[0]` → `PAGE/NAV[0]/BUTTON[2]`.
 */
function joinPath(parentPath: string, childRole: UIRole, index: number): string {
  return `${parentPath}/${childRole}[${index}]`;
}

/**
 * Convert a UINode to a minimal JSON-serializable object.
 *
 * @param node - The node to convert.
 * @param depth - Current tree depth (root is 0).
 * @param opts - Resolved render options.
 * @param path - Deterministic structural path of this node (for `includePath`).
 */
function nodeToJSON(
  node: UINode,
  depth: number,
  opts: Required<RenderJSONOptions>,
  path: string,
): JSONNode | null {
  if (depth > opts.maxDepth) return null;

  const out: JSONNode = {
    role: node.role,
    bbox: node.bbox,
  };

  // Addressability hints
  if (opts.includePath) {
    out.path = path;
  }
  if (opts.includeId) {
    out.id = node.id;
  }

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
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childPath = joinPath(path, child.role, i);
      const rendered = nodeToJSON(child, depth + 1, opts, childPath);
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
  const tree = nodeToJSON(capture.root, 0, opts, capture.root.role);
  return JSON.stringify(tree);
}

/**
 * Determine whether a node is "actionable" — i.e. something an LLM agent
 * could plausibly act on. A node qualifies when it is flagged interactive,
 * carries event handlers, or is one of the known actionable roles
 * (buttons, links, inputs, checkboxes, radios, icons).
 */
function isActionable(node: UINode): boolean {
  return (
    node.interactive ||
    (node.handlers !== undefined && node.handlers.length > 0) ||
    ACTIONABLE_ROLES.has(node.role)
  );
}

/**
 * Render a WebSketchCapture as a flat, addressable array of its actionable
 * nodes — the natural shape for an LLM tool-call menu, where each entry is
 * something an agent could click, type into, or otherwise act on.
 *
 * A node is included when it is interactive, has handlers, or is a known
 * actionable role (BUTTON, LINK, INPUT, CHECKBOX, RADIO, ICON). Each entry
 * carries the same deterministic `path` used by the diff engine, so an agent
 * can address the node by structural position.
 *
 * Pure and deterministic: nodes are emitted in document order (depth-first,
 * pre-order), the same order in which they appear in the tree.
 *
 * @param capture - The capture to flatten.
 * @param options - Rendering options. `maxDepth` bounds traversal; `includeId`
 *   is honored for parity but `path` is always present on flat entries. The
 *   `includePath` flag is implied (paths are intrinsic to this shape).
 * @returns An array of actionable-node entries with structural paths.
 *
 * @example
 * ```ts
 * const menu = renderJSONFlat(capture);
 * // [
 * //   { path: "PAGE/NAV[0]/BUTTON[2]", role: "BUTTON", bbox: [...], text: "string(6)", interactive: true },
 * //   { path: "PAGE/FORM[1]/INPUT[0]", role: "INPUT", bbox: [...], interactive: true },
 * // ]
 * ```
 */
export function renderJSONFlat(
  capture: WebSketchCapture,
  options?: RenderJSONOptions,
): RenderJSONFlatEntry[] {
  const opts: Required<RenderJSONOptions> = { ...DEFAULT_OPTIONS, ...options };
  const out: RenderJSONFlatEntry[] = [];

  const visit = (node: UINode, depth: number, path: string): void => {
    if (depth > opts.maxDepth) return;

    if (isActionable(node)) {
      const entry: RenderJSONFlatEntry = {
        path,
        role: node.role,
        bbox: node.bbox,
        interactive: node.interactive,
      };

      // Compact text descriptor, matching the tree renderer's convention.
      if (node.text && node.text.kind !== "none") {
        const len = node.text.len ?? 0;
        entry.text = len > 0 ? `${node.text.kind}(${len})` : node.text.kind;
      }

      if (node.handlers && node.handlers.length > 0) {
        entry.handlers = node.handlers.map((h: HandlerSignal) => {
          const h0: { event: string; intent: string; target?: string } = {
            event: h.event,
            intent: h.intent,
          };
          if (h.target) h0.target = h.target;
          return h0;
        });
      }

      out.push(entry);
    }

    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        visit(child, depth + 1, joinPath(path, child.role, i));
      }
    }
  };

  visit(capture.root, 0, capture.root.role);
  return out;
}
