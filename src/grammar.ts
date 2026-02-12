/**
 * WebSketch IR v0.1 - Grammar Types
 *
 * Core principles:
 * 1. Rendered layout is truth (getBoundingClientRect, not DOM positions)
 * 2. UI intent > DOM structure (compile to small primitive vocabulary)
 * 3. Normalize aggressively (remove stylistic noise; keep geometry + interactivity + semantics)
 * 4. Stable under "div soup" (wrappers collapse)
 */

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
  /** SHA-256 hash of normalized text (trim, collapse whitespace, lowercase) */
  hash?: string;
  /** Character length of normalized text */
  len?: number;
  /** Classification of text content */
  kind: TextKind;
}

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

/** Maximum tree depth (for stability) */
export const MAX_DEPTH = 8;

/** Maximum children per node (overflow summarized) */
export const MAX_CHILDREN = 200;

/** Bbox quantization step for hashing */
export const BBOX_QUANT_STEP = 0.001;

/** Collapse tolerance: nodes within this bbox difference are considered equal */
export const COLLAPSE_TOLERANCE = 0.002; // ~2px at 1000px viewport
