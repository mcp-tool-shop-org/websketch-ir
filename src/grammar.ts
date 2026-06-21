/**
 * WebSketch IR v0.1 - Grammar Types
 *
 * Core principles:
 * 1. Rendered layout is truth (getBoundingClientRect, not DOM positions)
 * 2. UI intent > DOM structure (compile to small primitive vocabulary)
 * 3. Normalize aggressively (remove stylistic noise; keep geometry + interactivity + semantics)
 * 4. Stable under "div soup" (wrappers collapse)
 */

/**
 * Single source of truth for the library version, stamped into capture
 * compiler metadata. Keep in sync with package.json `version`.
 */
export const LIBRARY_VERSION = "2.3.0";

// =============================================================================
// Bounding Box (viewport-relative 0-1)
// =============================================================================

/**
 * Bounding box normalized to viewport coordinates.
 * All values in range [0, 1] where (0,0) is top-left.
 * This is invariant across device pixel ratios.
 */
export type BBox01 = readonly [x: number, y: number, w: number, h: number];

/**
 * Viewport metadata for the capture.
 * Allows reconstruction of absolute positions if needed.
 */
export interface ViewportMeta {
  /** Viewport width in CSS pixels */
  w_px: number;
  /** Viewport height in CSS pixels */
  h_px: number;
  /** Aspect ratio (w_px / h_px) */
  aspect: number;
  /** Current scroll position normalized (0 = top, 1 = fully scrolled) */
  scroll_y01?: number;
}

// =============================================================================
// Text Handling
// =============================================================================

/**
 * Text content classification.
 * Used for structural comparison without storing actual content.
 */
export type TextKind = "none" | "short" | "sentence" | "paragraph" | "mixed";

/**
 * Text signal for a node.
 * Hash + shape, not content (for invariance + privacy).
 */
export interface TextSignal {
  /** FNV-1a 64-bit hash (16 hex chars) of normalized text (trim, collapse whitespace, lowercase) */
  hash?: string;
  /** Character length of normalized text */
  len?: number;
  /** Classification of text content */
  kind: TextKind;
}

// =============================================================================
// Event & Handler Signals
// =============================================================================

/**
 * DOM event types that a node can respond to.
 * Intentionally coarse — maps browser events to a small set of UI intents.
 */
export type EventType =
  | "click"
  | "hover"
  | "focus"
  | "blur"
  | "submit"
  | "change"
  | "input"
  | "keydown"
  | "scroll"
  | "drag"
  | "custom";

/**
 * Handler signal: a structural description of an event handler.
 * Like TextSignal — shapes and intents, not actual code.
 */
export interface HandlerSignal {
  /** The event this handler responds to */
  event: EventType;
  /** Coarse intent describing what the handler does (e.g., "navigate", "toggle_menu", "submit_form") */
  intent: string;
  /** Optional target node id this handler affects (for cross-node wiring) */
  target?: string;
}

/**
 * Binding signal: a reactive data-binding on a node property.
 * Represents declarative state → UI wiring without revealing implementation.
 */
export interface BindingSignal {
  /** The UI property being bound (e.g., "value", "checked", "visible", "text", "class") */
  property: string;
  /** Coarse expression hint (e.g., "state.count", "props.isOpen", "computed") */
  expression: string;
}

/** All valid EventType values. */
export const VALID_EVENT_TYPES: ReadonlySet<string> = new Set<EventType>([
  "click", "hover", "focus", "blur", "submit",
  "change", "input", "keydown", "scroll", "drag", "custom",
]);

// =============================================================================
// State Signals
// =============================================================================

/**
 * How a node accesses a piece of state.
 */
export type StateAccessKind = "read" | "write" | "readwrite" | "condition";

/**
 * State signal: describes a piece of reactive state that a node
 * reads from, writes to, or conditions its visibility/behavior on.
 * This is deliberately abstract — no framework types, just shapes.
 *
 * @example
 * ```ts
 * { key: "cart.items", access: "read", scope: "global" }
 * { key: "isOpen", access: "readwrite", scope: "local" }
 * { key: "user.isLoggedIn", access: "condition", scope: "global" }
 * ```
 */
export interface StateSignal {
  /** Dot-path key identifying the state slice (e.g., "form.email", "cart.total") */
  key: string;
  /** How this node interacts with the state */
  access: StateAccessKind;
  /** Scope hint: "local" (component), "global" (store/context), or "url" (query/path params) */
  scope?: "local" | "global" | "url";
}

/** All valid StateAccessKind values. */
export const VALID_STATE_ACCESS_KINDS: ReadonlySet<string> = new Set<StateAccessKind>([
  "read", "write", "readwrite", "condition",
]);

/** All valid state scope values. */
export const VALID_STATE_SCOPES: ReadonlySet<string> = new Set([
  "local", "global", "url",
]);

// =============================================================================
// Style Intent Tokens
// =============================================================================

/**
 * Coarse visual intent tokens.
 * These are NOT CSS values — they are design-system-level semantic markers
 * that tell an LLM *why* something looks the way it does.
 */
export type StyleIntentToken =
  | "primary"       // Primary action / accent color
  | "secondary"     // Secondary / muted action
  | "destructive"   // Danger / delete / error
  | "success"       // Success / confirmation / green
  | "warning"       // Warning / caution / yellow-orange
  | "info"          // Informational / blue
  | "muted"         // De-emphasized / disabled-looking
  | "elevated"      // Has shadow / raised above surface
  | "outlined"      // Border-only, no fill
  | "ghost"         // Transparent background, text-only affordance
  | "inverted"      // Dark-on-light flipped (e.g., dark navbar)
  | "highlight"     // Visually highlighted / selected state
  | "truncated"     // Text overflow / ellipsis
  | "monospace"     // Code / pre-formatted text
  | "custom";       // Anything else

/**
 * Style intent for a node.
 * Captures the *visual purpose* of a node's appearance,
 * not the raw CSS. Multiple tokens can apply (e.g., primary + elevated).
 */
export interface StyleIntent {
  /** Visual intent tokens that apply to this node */
  tokens: StyleIntentToken[];
  /** Optional density hint: how tightly packed the content is */
  density?: "compact" | "normal" | "spacious";
  /** Optional size hint relative to siblings */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/** All valid StyleIntentToken values. */
export const VALID_STYLE_INTENT_TOKENS: ReadonlySet<string> = new Set<StyleIntentToken>([
  "primary", "secondary", "destructive", "success", "warning",
  "info", "muted", "elevated", "outlined", "ghost",
  "inverted", "highlight", "truncated", "monospace", "custom",
]);

/** Valid density values. */
export const VALID_DENSITIES: ReadonlySet<string> = new Set(["compact", "normal", "spacious"]);

/** Valid size values. */
export const VALID_SIZES: ReadonlySet<string> = new Set(["xs", "sm", "md", "lg", "xl"]);

// =============================================================================
// Pattern / Composition Markers
// =============================================================================

/**
 * Coarse classification of a reusable UI pattern.
 * These identify well-known structural compositions an LLM can reason about.
 * "custom" is the escape hatch — use `name` for identification.
 */
export type PatternKind =
  | "search_bar"     // Search input + button / filter combo
  | "auth_form"      // Login / registration / password reset form
  | "product_card"   // E-commerce product tile (image + price + CTA)
  | "nav_menu"       // Primary / secondary / mobile navigation menu
  | "data_table"     // Filterable / sortable table with pagination
  | "wizard_step"    // Multi-step form / onboarding wizard
  | "media_player"   // Audio / video player controls
  | "chat_thread"    // Message list + input compose area
  | "dashboard_widget" // KPI card / chart / metric tile
  | "custom";        // Anything else — use `name` to identify

/**
 * Pattern signal: identifies a node as an instance of a reusable UI pattern
 * and describes its role within a composition.
 *
 * Enables LLMs to recognize higher-level structures beyond individual roles.
 *
 * @example
 * ```ts
 * { kind: "search_bar", name: "global-search" }
 * { kind: "auth_form", variant: "login" }
 * { kind: "wizard_step", slot: "step-2", name: "checkout-wizard" }
 * { kind: "custom", name: "pricing-tier-card", variant: "enterprise" }
 * ```
 */
export interface PatternSignal {
  /** Which reusable UI pattern this node belongs to */
  kind: PatternKind;
  /** Optional human-readable name identifying this pattern instance */
  name?: string;
  /** Optional variant (e.g., "login" vs "register" for auth_form) */
  variant?: string;
  /** Optional slot identifier for composition (e.g., "header", "step-2") */
  slot?: string;
}

/** All valid PatternKind values. */
export const VALID_PATTERN_KINDS: ReadonlySet<string> = new Set<PatternKind>([
  "search_bar", "auth_form", "product_card", "nav_menu",
  "data_table", "wizard_step", "media_player", "chat_thread",
  "dashboard_widget", "custom",
]);

// =============================================================================
// UI Roles (the primitive vocabulary)
// =============================================================================

/**
 * UI primitive roles.
 * This is intentionally small - covers ~95% of real UI patterns.
 * The goal is intent, not HTML element types.
 */
export type UIRole =
  // Layout containers
  | "PAGE"      // Root container
  | "NAV"       // Navigation container (sidebar, navbar, menu)
  | "HEADER"    // Page or section header
  | "FOOTER"    // Page or section footer
  | "SECTION"   // Generic content section
  | "CARD"      // Content card/tile
  | "LIST"      // Repeated items container
  | "TABLE"     // Structured tabular data

  // Overlays
  | "MODAL"     // Modal dialog
  | "TOAST"     // Ephemeral notification
  | "DROPDOWN"  // Dropdown/select menu (when open)

  // Interactive primitives
  | "FORM"      // Form container
  | "INPUT"     // Text input (text, email, password, search, etc.)
  | "BUTTON"    // Action trigger (button, submit)
  | "LINK"      // Navigation trigger (anchor)
  | "CHECKBOX"  // Boolean toggle
  | "RADIO"     // Single-select option
  | "ICON"      // Small clickable icon/affordance

  // Content
  | "IMAGE"     // Visual content
  | "TEXT"      // Text block

  // Pagination
  | "PAGINATION" // Page navigation controls

  // Fallback
  | "UNKNOWN";  // Could not determine role

/**
 * All valid UIRole values as a readonly array.
 * Enables compile-time safety when iterating or checking exhaustiveness
 * as new roles are added.
 */
export const ROLES: readonly UIRole[] = [
  "PAGE", "NAV", "HEADER", "FOOTER", "SECTION", "CARD", "LIST", "TABLE",
  "MODAL", "TOAST", "DROPDOWN",
  "FORM", "INPUT", "BUTTON", "LINK", "CHECKBOX", "RADIO", "ICON",
  "IMAGE", "TEXT",
  "PAGINATION",
  "UNKNOWN",
] as const;

// =============================================================================
// UI Node (the core primitive)
// =============================================================================

/**
 * Behavior/state flags for a node.
 */
export interface UINodeFlags {
  /** Position: sticky or fixed */
  sticky?: boolean;
  /** Has scrollable overflow */
  scrollable?: boolean;
  /** Part of a repeated pattern (LIST items) */
  repeated?: boolean;
}

/**
 * A single UI primitive in the layout tree.
 * This is NOT a DOM node - it's a compiled representation of UI intent.
 */
export interface UINode {
  /** Stable ID within capture (content-addressed or path-based) */
  id: string;

  /** UI role (the primitive type) */
  role: UIRole;

  // -- Semantics --

  /** Coarse semantic hint (e.g., "login", "search", "checkout", "primary_cta") */
  semantic?: string;

  /** Hash of aria-label/name/id for matching (not the actual value) */
  name_hash?: string;

  /** Text content signal */
  text?: TextSignal;

  // -- Geometry --

  /** Bounding box in viewport-relative coordinates [0,1] */
  bbox: BBox01;

  /** Coarse z-index bucket (0-10, where 10 is topmost) */
  z?: number;

  // -- Behavior & Visibility --

  /** Can receive user interaction (click, type, etc.) */
  interactive: boolean;

  /** Not disabled */
  enabled?: boolean;

  /** Currently visible (not display:none, visibility:hidden, or zero-area) */
  visible: boolean;

  /** Can receive keyboard focus */
  focusable?: boolean;

  // -- Event Handlers & Bindings --

  /** Event handlers attached to this node */
  handlers?: HandlerSignal[];

  /** Reactive data bindings on this node */
  bindings?: BindingSignal[];

  // -- State --

  /** Reactive state this node reads/writes/conditions on */
  state?: StateSignal[];

  // -- Visual Intent --

  /** Design-system-level style intent tokens */
  style?: StyleIntent;

  // -- Pattern / Composition --

  /** Identifies this node as an instance of a reusable UI pattern */
  pattern?: PatternSignal;

  // -- Structure --

  /** Child nodes (semantic grouping, not DOM children) */
  children?: UINode[];

  // -- Invariance helpers --

  /** Additional state flags */
  flags?: UINodeFlags;
}

// =============================================================================
// Capture (top-level artifact)
// =============================================================================

/**
 * Compiler metadata for reproducibility.
 */
export interface CompilerMeta {
  /** Compiler name */
  name: "websketch-ir";
  /** Compiler version */
  version: string;
  /** Hash of compiler options used */
  options_hash: string;
}

/**
 * A complete WebSketch capture.
 * This is the serializable artifact produced by the extension.
 */
export interface WebSketchCapture {
  /** Schema version */
  version: "0.1";

  /** Source URL */
  url: string;

  /** Capture timestamp (ms since epoch) */
  timestamp_ms: number;

  /** Viewport at time of capture */
  viewport: ViewportMeta;

  /** Compiler metadata */
  compiler: CompilerMeta;

  /** Root node (always role: "PAGE") */
  root: UINode;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum tree depth for compiler output (collapse/summary boundary).
 * This is the depth limit used during DOM-to-IR compilation — nodes deeper
 * than this are summarized or collapsed. Not to be confused with
 * {@link DEFAULT_LIMITS.maxDepth} in errors.ts (default: 50), which is the
 * validation limit for accepting already-compiled captures.
 */
export const MAX_DEPTH = 8;

/** Maximum children per node (overflow summarized) */
export const MAX_CHILDREN = 200;

/** Bbox quantization step for hashing */
export const BBOX_QUANT_STEP = 0.001;

/** Collapse tolerance: nodes within this bbox difference are considered equal */
export const COLLAPSE_TOLERANCE = 0.002; // ~2px at 1000px viewport

// =============================================================================
// Tree Traversal Utilities
// =============================================================================

/**
 * Flatten all nodes in a tree to a flat array using depth-first order.
 *
 * @param root - The root node to traverse
 * @returns All nodes in DFS order (root first, then children recursively)
 */
export function flattenNodes(root: UINode): UINode[] {
  const result: UINode[] = [];
  const stack: UINode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node);
    // Push children in reverse so leftmost child is processed first
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }
  return result;
}

/**
 * Walk all nodes in a tree, calling a visitor function on each node.
 * Traversal is depth-first, pre-order.
 *
 * @param root - The root node to traverse
 * @param visitor - Callback invoked with each node and its depth (root = 0)
 */
export function walkNodes(
  root: UINode,
  visitor: (node: UINode, depth: number) => void,
): void {
  const stack: Array<{ node: UINode; depth: number }> = [{ node: root, depth: 0 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    visitor(node, depth);
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[i], depth: depth + 1 });
      }
    }
  }
}

/**
 * Filter nodes in a tree, returning all nodes that match a predicate.
 * Traversal is depth-first order.
 *
 * @param root - The root node to traverse
 * @param predicate - Function that returns true for nodes to include
 * @returns Array of matching nodes in DFS order
 */
export function filterNodes(
  root: UINode,
  predicate: (node: UINode) => boolean,
): UINode[] {
  const result: UINode[] = [];
  const stack: UINode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (predicate(node)) {
      result.push(node);
    }
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }
  return result;
}

// =============================================================================
// Query / Selector API
// =============================================================================

/**
 * Return all nodes matching the given role.
 * Uses {@link filterNodes} internally.
 *
 * @param root - The root node to search from
 * @param role - The UIRole to match
 * @returns All nodes with the specified role in DFS order
 */
export function queryByRole(root: UINode, role: UIRole): UINode[] {
  return filterNodes(root, (n) => n.role === role);
}

/**
 * Return all nodes matching a predicate.
 * This is a discoverable alias for {@link filterNodes}.
 *
 * @param root - The root node to search from
 * @param predicate - Function that returns true for nodes to include
 * @returns All matching nodes in DFS order
 */
export function queryByPredicate(
  root: UINode,
  predicate: (node: UINode) => boolean,
): UINode[] {
  return filterNodes(root, predicate);
}

/**
 * Return the first node matching a predicate (DFS).
 * Stops traversal early once a match is found for efficiency.
 *
 * @param root - The root node to search from
 * @param predicate - Function that returns true for the desired node
 * @returns The first matching node, or undefined if none match
 */
export function findFirst(
  root: UINode,
  predicate: (node: UINode) => boolean,
): UINode | undefined {
  const stack: UINode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (predicate(node)) {
      return node;
    }
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }
  return undefined;
}

/**
 * Return the first node matching the given role (DFS).
 * Convenience wrapper around {@link findFirst}.
 *
 * @param root - The root node to search from
 * @param role - The UIRole to match
 * @returns The first node with the specified role, or undefined if none match
 */
export function findByRole(root: UINode, role: UIRole): UINode | undefined {
  return findFirst(root, (n) => n.role === role);
}

// =============================================================================
// Addressability / Relationship API
// =============================================================================

/**
 * Return the first node whose `id` matches the given id (DFS).
 * Convenience wrapper around {@link findFirst} for id-based addressing.
 *
 * @param root - The root node to search from
 * @param id - The node id to match
 * @returns The first node with the specified id, or undefined if none match
 */
export function findById(root: UINode, id: string): UINode | undefined {
  return findFirst(root, (n) => n.id === id);
}

/**
 * Compute the index path from `root` to `target`, matched by reference identity.
 * The path is an array of child indices: following `children[path[0]]`,
 * `children[path[1]]`, ... from the root reaches `target`.
 *
 * Returns `[]` when `target` is `root` itself, and `undefined` when `target`
 * is not present anywhere in the tree.
 *
 * @param root - The root node to search from
 * @param target - The node to locate (matched by reference, not by id)
 * @returns The index path from root to target, or undefined if not found
 */
export function getPath(root: UINode, target: UINode): number[] | undefined {
  if (root === target) {
    return [];
  }
  type Frame = { node: UINode; path: number[] };
  const stack: Frame[] = [{ node: root, path: [] }];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    const { node, path } = frame;
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        const childPath = [...path, i];
        if (child === target) {
          return childPath;
        }
        stack.push({ node: child, path: childPath });
      }
    }
  }
  return undefined;
}

/**
 * Return the parent of `target` (matched by reference identity).
 * The root has no parent, so `undefined` is returned when `target` is `root`
 * or is not present in the tree.
 *
 * @param root - The root node to search from
 * @param target - The node whose parent to find (matched by reference)
 * @returns The parent node, or undefined if target is the root or not found
 */
export function getParent(root: UINode, target: UINode): UINode | undefined {
  const stack: UINode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (node.children) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child === target) {
          return node;
        }
        stack.push(child);
      }
    }
  }
  return undefined;
}

/**
 * Return the nearest ancestor of `target` (matched by reference) that satisfies
 * `predicate`. Walks upward from `target`'s parent toward the root, returning
 * the first match. `target` itself is never considered.
 *
 * @param root - The root node containing the tree
 * @param target - The node whose ancestors to search (matched by reference)
 * @param predicate - Function that returns true for the desired ancestor
 * @returns The nearest matching ancestor, or undefined if none match
 */
export function findAncestor(
  root: UINode,
  target: UINode,
  predicate: (node: UINode) => boolean,
): UINode | undefined {
  let current = getParent(root, target);
  while (current) {
    if (predicate(current)) {
      return current;
    }
    current = getParent(root, current);
  }
  return undefined;
}

/**
 * Return every node of the given `role` that is a descendant of some node
 * matching `containerPredicate` (e.g., every INPUT inside a FORM).
 *
 * Results are in DFS order and de-duplicated by reference, so nested matching
 * containers never yield the same node twice.
 *
 * @param root - The root node to search from
 * @param containerPredicate - Identifies container nodes to scope the search
 * @param role - The UIRole descendants must have to be included
 * @returns Matching descendant nodes in DFS order
 */
export function queryWithin(
  root: UINode,
  containerPredicate: (node: UINode) => boolean,
  role: UIRole,
): UINode[] {
  const result: UINode[] = [];
  const seen = new Set<UINode>();
  for (const container of flattenNodes(root)) {
    if (!containerPredicate(container) || !container.children) {
      continue;
    }
    for (const child of container.children) {
      for (const descendant of flattenNodes(child)) {
        if (descendant.role === role && !seen.has(descendant)) {
          seen.add(descendant);
          result.push(descendant);
        }
      }
    }
  }
  return result;
}

// =============================================================================
// Builder / Factory API
// =============================================================================

/**
 * Create a UINode with sensible defaults.
 * Only `role` and `bbox` are required; all other fields use defaults
 * (visible: true, interactive: false).
 *
 * The default `id` is an empty-string placeholder (`""`), NOT a stable or
 * content-addressed id. This keeps `createNode` deterministic — its output
 * depends only on its inputs. The placeholder is intended to be finalized by
 * {@link assignNodeIds} (from `hash.ts`), which assigns deterministic,
 * content-addressed ids once the tree is assembled. Pass `options.id` to
 * supply an explicit id and bypass the placeholder.
 *
 * @param role - The UI role for this node
 * @param bbox - Bounding box in viewport-relative [0,1] coordinates
 * @param options - Optional partial overrides for any UINode field
 * @returns A complete UINode
 */
export function createNode(
  role: UIRole,
  bbox: BBox01,
  options?: Partial<UINode>,
): UINode {
  return {
    id: "",
    role,
    bbox,
    interactive: false,
    visible: true,
    ...options,
  };
}

/**
 * Create a complete WebSketchCapture with sensible defaults.
 * Provides reasonable fallbacks for compiler metadata, viewport, timestamp, and URL.
 *
 * Note: the builders do not validate inputs — use {@link parseCapture} or
 * `validateCapture` (from `errors.ts`) for untrusted data.
 *
 * @param root - The root UINode (should have role "PAGE")
 * @param metadata - Optional overrides for url, viewport, and timestamp_ms
 * @returns A complete WebSketchCapture ready for serialization
 */
export function createCapture(
  root: UINode,
  metadata?: {
    url?: string;
    viewport?: Partial<ViewportMeta>;
    timestamp_ms?: number;
  },
): WebSketchCapture {
  const w_px = metadata?.viewport?.w_px ?? 1280;
  const h_px = metadata?.viewport?.h_px ?? 800;
  // Guard the derived aspect so a non-positive or non-finite h_px never yields
  // NaN/Infinity; fall back to the default 1280/800 ratio in that case.
  const derivedAspect =
    Number.isFinite(h_px) && h_px > 0 && Number.isFinite(w_px) ? w_px / h_px : 1280 / 800;
  return {
    version: "0.1",
    url: metadata?.url ?? "about:blank",
    timestamp_ms: metadata?.timestamp_ms ?? Date.now(),
    viewport: {
      w_px,
      h_px,
      aspect: metadata?.viewport?.aspect ?? derivedAspect,
      ...metadata?.viewport,
    },
    compiler: {
      name: "websketch-ir",
      version: LIBRARY_VERSION,
      options_hash: "default",
    },
    root,
  };
}
