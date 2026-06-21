/**
 * WebSketch IR v0.1 - ASCII Renderer
 *
 * Renders a WebSketchCapture to a fixed-size ASCII grid.
 * This is the "killer feature" for LLM consumption - a page representation
 * that can be reasoned about without vision models.
 *
 * Design principles:
 * - Deterministic and coarse (not "pretty")
 * - Fixed grid (default 80x24)
 * - Labels only important nodes
 * - Shows role + semantic, not content
 */

import type { BBox01, UINode, UIRole, WebSketchCapture } from "../grammar.js";

// =============================================================================
// Types
// =============================================================================

export interface AsciiRenderOptions {
  /** Grid width in characters (default: 80) */
  width?: number;
  /** Grid height in characters (default: 24) */
  height?: number;
  /** Show only these roles (default: all important roles) */
  showRoles?: UIRole[];
  /** Show semantic labels (default: true) */
  showSemantics?: boolean;
  /** Show text length indicator (default: true) */
  showTextLen?: boolean;
  /** Border style: "box" | "ascii" | "none" (default: "box") */
  borderStyle?: "box" | "ascii" | "none";
  /** Include legend at bottom (default: false) */
  showLegend?: boolean;
  /** Indentation size in spaces for nested labels (default: 2) */
  indentSize?: number;
}

interface GridCell {
  char: string;
  priority: number; // Higher priority chars overwrite lower
}

// =============================================================================
// Constants
// =============================================================================

/** Default roles to render (important for LLM understanding) */
const DEFAULT_SHOW_ROLES: UIRole[] = [
  "NAV",
  "HEADER",
  "FOOTER",
  "MODAL",
  "TOAST",
  "FORM",
  "LIST",
  "TABLE",
  "CARD",
  "INPUT",
  "BUTTON",
  "LINK",
  "DROPDOWN",
  "CHECKBOX",
  "RADIO",
  "IMAGE",
  "PAGINATION",
];

/** Role abbreviations for compact display */
const ROLE_ABBREV: Record<UIRole, string> = {
  PAGE: "PG",
  NAV: "NAV",
  HEADER: "HDR",
  FOOTER: "FTR",
  SECTION: "SEC",
  CARD: "CRD",
  LIST: "LST",
  TABLE: "TBL",
  MODAL: "MDL",
  TOAST: "TST",
  DROPDOWN: "DRP",
  FORM: "FRM",
  INPUT: "INP",
  BUTTON: "BTN",
  LINK: "LNK",
  CHECKBOX: "CHK",
  RADIO: "RAD",
  ICON: "ICO",
  IMAGE: "IMG",
  TEXT: "TXT",
  PAGINATION: "PAG",
  UNKNOWN: "???",
};

/** Priority for role rendering (higher = rendered on top) */
const ROLE_PRIORITY: Record<UIRole, number> = {
  PAGE: 0,
  SECTION: 1,
  CARD: 2,
  LIST: 2,
  TABLE: 2,
  NAV: 3,
  HEADER: 3,
  FOOTER: 3,
  FORM: 4,
  TEXT: 1,
  IMAGE: 2,
  INPUT: 5,
  BUTTON: 6,
  LINK: 5,
  DROPDOWN: 5,
  CHECKBOX: 5,
  RADIO: 5,
  ICON: 4,
  PAGINATION: 3,
  MODAL: 8,
  TOAST: 9,
  UNKNOWN: 0,
};

/** Box drawing characters */
const BOX_CHARS = {
  box: {
    tl: "┌",
    tr: "┐",
    bl: "└",
    br: "┘",
    h: "─",
    v: "│",
  },
  ascii: {
    tl: "+",
    tr: "+",
    bl: "+",
    br: "+",
    h: "-",
    v: "|",
  },
  none: {
    tl: " ",
    tr: " ",
    bl: " ",
    br: " ",
    h: " ",
    v: " ",
  },
} as const;

// =============================================================================
// Grid Management
// =============================================================================

class AsciiGrid {
  private cells: GridCell[][];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ char: " ", priority: -1 }))
    );
  }

  /** Set a cell if priority allows */
  set(x: number, y: number, char: string, priority: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    if (priority >= this.cells[y][x].priority) {
      this.cells[y][x] = { char, priority };
    }
  }

  /** Write a string starting at position */
  writeString(x: number, y: number, str: string, priority: number): void {
    for (let i = 0; i < str.length; i++) {
      this.set(x + i, y, str[i], priority);
    }
  }

  /** Draw a box outline */
  drawBox(
    x: number,
    y: number,
    w: number,
    h: number,
    priority: number,
    style: "box" | "ascii" | "none" = "box"
  ): void {
    const chars = BOX_CHARS[style];

    // Ensure minimum size
    if (w < 2 || h < 2) return;

    // Corners
    this.set(x, y, chars.tl, priority);
    this.set(x + w - 1, y, chars.tr, priority);
    this.set(x, y + h - 1, chars.bl, priority);
    this.set(x + w - 1, y + h - 1, chars.br, priority);

    // Horizontal edges
    for (let i = 1; i < w - 1; i++) {
      this.set(x + i, y, chars.h, priority);
      this.set(x + i, y + h - 1, chars.h, priority);
    }

    // Vertical edges
    for (let j = 1; j < h - 1; j++) {
      this.set(x, y + j, chars.v, priority);
      this.set(x + w - 1, y + j, chars.v, priority);
    }
  }

  /** Render to string */
  toString(): string {
    return this.cells.map((row) => row.map((cell) => cell.char).join("")).join("\n");
  }
}

// =============================================================================
// Node Rendering
// =============================================================================

/** Container roles that get box outlines (hoisted to module scope for reuse) */
const CONTAINER_ROLES: ReadonlySet<UIRole> = new Set<UIRole>([
  "NAV", "HEADER", "FOOTER", "FORM", "MODAL", "TOAST",
  "CARD", "LIST", "TABLE", "SECTION",
]);

/**
 * Coerce a non-finite number (NaN/Infinity/-Infinity) to a sentinel so the
 * ASCII path fails soft on bad geometry instead of throwing. Finite values
 * pass through unchanged.
 */
function finiteOr(value: number, sentinel: number): number {
  return Number.isFinite(value) ? value : sentinel;
}

/** Convert bbox (0-1) to grid coordinates */
function bboxToGrid(
  bbox: BBox01,
  gridWidth: number,
  gridHeight: number
): { x: number; y: number; w: number; h: number } {
  // Coerce non-finite bbox components to 0 so renderAscii/renderForLLM/
  // renderStructure fail soft on NaN/Infinity geometry instead of throwing.
  const x0 = finiteOr(bbox[0], 0);
  const y0 = finiteOr(bbox[1], 0);
  const w0 = finiteOr(bbox[2], 0);
  const h0 = finiteOr(bbox[3], 0);
  return {
    x: Math.floor(x0 * gridWidth),
    y: Math.floor(y0 * gridHeight),
    w: Math.max(2, Math.ceil(w0 * gridWidth)),
    h: Math.max(2, Math.ceil(h0 * gridHeight)),
  };
}

/** Generate label for a node */
function nodeLabel(node: UINode, options: AsciiRenderOptions): string {
  const parts: string[] = [];

  // Role abbreviation
  parts.push(ROLE_ABBREV[node.role]);

  // Semantic hint
  if (options.showSemantics && node.semantic) {
    parts.push(`:${node.semantic}`);
  }

  // Text length indicator
  if (options.showTextLen && node.text?.len) {
    const lenIndicator =
      node.text.len < 10
        ? "."
        : node.text.len < 50
          ? ".."
          : node.text.len < 200
            ? "..."
            : "....";
    parts.push(lenIndicator);
  }

  return `[${parts.join("")}]`;
}

/** Check if a node should be rendered */
function shouldRender(node: UINode, showRoles: UIRole[]): boolean {
  // Always render interactive nodes
  if (node.interactive) return true;

  // Check if role is in show list
  return showRoles.includes(node.role);
}

/** Recursively render a node and its children */
function renderNode(
  grid: AsciiGrid,
  node: UINode,
  options: Required<AsciiRenderOptions>
): void {
  // Check if we should render this node
  if (!shouldRender(node, options.showRoles)) {
    // Still recurse to children
    if (node.children) {
      for (const child of node.children) {
        renderNode(grid, child, options);
      }
    }
    return;
  }

  const { x, y, w, h } = bboxToGrid(node.bbox, options.width, options.height);
  const priority = ROLE_PRIORITY[node.role];

  // Draw box for container-like nodes
  const isContainer = CONTAINER_ROLES.has(node.role);

  if (isContainer && w >= 4 && h >= 3) {
    grid.drawBox(x, y, w, h, priority, options.borderStyle);
  }

  // Generate and place label
  const label = nodeLabel(node, options);

  // Place label inside the box (top-left, offset by 1 for containers)
  const labelX = x + 1;
  const labelY = y + (isContainer ? 1 : 0);

  // Truncate label if needed; skip rendering for very narrow boxes
  const maxLabelLen = Math.max(0, w - 2);
  if (maxLabelLen <= 0) {
    // Too narrow for any label — skip
  } else {
    const truncatedLabel = label.length > maxLabelLen ? label.slice(0, maxLabelLen - 1) + "…" : label;
    grid.writeString(labelX, labelY, truncatedLabel, priority + 1);
  }

  // Render children
  if (node.children) {
    for (const child of node.children) {
      renderNode(grid, child, options);
    }
  }
}

// =============================================================================
// Public API
// =============================================================================

const DEFAULT_OPTIONS: Required<AsciiRenderOptions> = {
  width: 80,
  height: 24,
  showRoles: DEFAULT_SHOW_ROLES,
  showSemantics: true,
  showTextLen: true,
  borderStyle: "box",
  showLegend: false,
  indentSize: 2,
};

/**
 * Render a WebSketchCapture to ASCII art.
 */
export function renderAscii(
  capture: WebSketchCapture,
  options: AsciiRenderOptions = {}
): string {
  const opts: Required<AsciiRenderOptions> = { ...DEFAULT_OPTIONS, ...options };

  if (opts.width <= 0 || opts.height <= 0) {
    return "<!-- empty: zero-dimension viewport -->";
  }

  const grid = new AsciiGrid(opts.width, opts.height);

  // Render the tree
  renderNode(grid, capture.root, opts);

  // Build output
  let output = grid.toString();

  // Add legend if requested
  if (opts.showLegend) {
    output += "\n" + "─".repeat(opts.width);
    output += "\n" + generateLegend();
  }

  return output;
}

/**
 * Render just a UINode subtree to ASCII (without capture metadata).
 */
export function renderNodeAscii(
  node: UINode,
  options: AsciiRenderOptions = {}
): string {
  const opts: Required<AsciiRenderOptions> = { ...DEFAULT_OPTIONS, ...options };

  if (opts.width <= 0 || opts.height <= 0) {
    return "<!-- empty: zero-dimension viewport -->";
  }

  const grid = new AsciiGrid(opts.width, opts.height);
  renderNode(grid, node, opts);

  return grid.toString();
}

/**
 * Generate a compact legend for role abbreviations.
 */
export function generateLegend(): string {
  const pairs = Object.entries(ROLE_ABBREV)
    .filter(([role]) => DEFAULT_SHOW_ROLES.includes(role as UIRole))
    .map(([role, abbrev]) => `${abbrev}=${role}`);

  return pairs.join(" | ");
}

// =============================================================================
// Specialized Renderers
// =============================================================================

/**
 * Render a minimal "structure only" view (no semantics, no text).
 * Useful for quick structural comparison.
 */
export function renderStructure(
  capture: WebSketchCapture,
  width: number = 60,
  height: number = 16
): string {
  return renderAscii(capture, {
    width,
    height,
    showSemantics: false,
    showTextLen: false,
    borderStyle: "ascii",
  });
}

/**
 * Options for {@link renderForLLM}.
 *
 * All fields are optional; omitting the options object (or any field)
 * reproduces the historical fixed 80x24 output with the full metadata
 * header, timestamp line, and legend.
 */
export interface RenderForLLMOptions {
  /** Grid width in characters (default: 80) */
  width?: number;
  /** Grid height in characters (default: 24) */
  height?: number;
  /** Include the URL/viewport/timestamp header block (default: true) */
  includeMetadata?: boolean;
  /** Include the role-abbreviation legend at the bottom (default: true) */
  includeLegend?: boolean;
  /** Include the "Captured:" timestamp line within the header (default: true) */
  includeTimestamp?: boolean;
  /** Restrict rendered nodes to these roles (default: all important roles) */
  showRoles?: UIRole[];
}

/**
 * Render an LLM-optimized view with full detail.
 *
 * With no options, emits the historical fixed 80x24 layout: a metadata
 * header (URL / viewport / timestamp), the ASCII grid, then the legend.
 * Pass {@link RenderForLLMOptions} to resize the grid or trim any of those
 * sections.
 */
export function renderForLLM(
  capture: WebSketchCapture,
  options: RenderForLLMOptions = {}
): string {
  const width = options.width ?? 80;
  const height = options.height ?? 24;
  const includeMetadata = options.includeMetadata ?? true;
  const includeLegend = options.includeLegend ?? true;
  const includeTimestamp = options.includeTimestamp ?? true;

  const asciiOptions: AsciiRenderOptions = {
    width,
    height,
    showSemantics: true,
    showTextLen: true,
    borderStyle: "box",
  };
  if (options.showRoles) {
    asciiOptions.showRoles = options.showRoles;
  }

  const ascii = renderAscii(capture, asciiOptions);

  const sections: string[] = [];

  if (includeMetadata) {
    const headerLines = [
      `URL: ${capture.url}`,
      `Viewport: ${capture.viewport.w_px}x${capture.viewport.h_px}`,
    ];

    if (includeTimestamp) {
      // Guard against non-finite / out-of-range timestamps so toISOString()
      // never throws a RangeError on bad capture metadata.
      const t = Number(capture.timestamp_ms);
      const stamp = Number.isFinite(t) ? new Date(t).toISOString() : "unknown";
      headerLines.push(`Captured: ${stamp}`);
    }

    headerLines.push("─".repeat(width));
    sections.push(headerLines.join("\n"));
  }

  sections.push(ascii);

  if (includeLegend) {
    sections.push("─".repeat(width));
    sections.push(generateLegend());
  }

  return sections.join("\n");
}
