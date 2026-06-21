/**
 * WebSketch IR v0.1 - HTML Code Generator
 *
 * Emits semantic HTML from a WebSketchCapture.
 * Maps UIRoles to appropriate HTML5 elements and includes handler
 * intents as data attributes for downstream LLM consumption.
 *
 * Design principles:
 * - Semantic HTML over div soup (BUTTON → <button>, NAV → <nav>)
 * - Handler intents surfaced as data-wsk-* attributes
 * - Binding hints as data-wsk-bind-* attributes
 * - BBox geometry preserved as data-wsk-bbox for layout reconstruction
 * - Deterministic output (sorted attributes, stable child ordering)
 */

import type {
  UINode,
  UIRole,
  WebSketchCapture,
} from "../grammar.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for HTML emission.
 */
export interface EmitHTMLOptions {
  /** Indentation string (default: "  " — 2 spaces) */
  indent?: string;
  /** Include data-wsk-bbox attributes (default: true) */
  includeBbox?: boolean;
  /** Include handler data attributes (default: true) */
  includeHandlers?: boolean;
  /** Include binding data attributes (default: true) */
  includeBindings?: boolean;
  /** Include state signal data attributes (default: true) */
  includeState?: boolean;
  /** Include style intent data attributes (default: true) */
  includeStyle?: boolean;
  /** Include pattern signal data attributes (default: true) */
  includePattern?: boolean;
  /** Include semantic hints as data attributes (default: true) */
  includeSemantics?: boolean;
  /** Wrap output in full HTML document (default: false) */
  fullDocument?: boolean;
  /** Include CSS class with role name (default: true) */
  includeRoleClass?: boolean;
}

// =============================================================================
// Role → HTML Element Mapping
// =============================================================================

/** Maps UIRole to the most semantic HTML element. */
const ROLE_TO_ELEMENT: Record<UIRole, string> = {
  PAGE: "main",
  NAV: "nav",
  HEADER: "header",
  FOOTER: "footer",
  SECTION: "section",
  CARD: "article",
  LIST: "ul",
  TABLE: "table",
  MODAL: "dialog",
  TOAST: "aside",
  DROPDOWN: "div",
  FORM: "form",
  INPUT: "input",
  BUTTON: "button",
  LINK: "a",
  CHECKBOX: "input",
  RADIO: "input",
  ICON: "span",
  IMAGE: "img",
  TEXT: "p",
  PAGINATION: "nav",
  UNKNOWN: "div",
};

/** Self-closing (void) HTML elements. */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "input", "img", "br", "hr", "meta", "link",
]);

// =============================================================================
// Attribute Helpers
// =============================================================================

/**
 * Escape a string for safe use in an HTML attribute value.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape text content for HTML body.
 */
function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Allowlist for safe HTML attribute-name characters. */
const ATTR_KEY_ALLOWED = /^[a-zA-Z0-9_-]+$/;

/**
 * Sanitize a dynamic attribute-name fragment to the strict allowlist
 * charset, stripping any character that could break out of the attribute
 * name (attribute-name injection / XSS). Empty result falls back to "x"
 * so the emitted key is always well-formed.
 */
function sanitizeAttrKeyPart(part: string): string {
  const cleaned = part.replace(/[^a-zA-Z0-9_-]+/g, "");
  return cleaned.length > 0 ? cleaned : "x";
}

/**
 * Build attribute string from key-value pairs.
 * Keys are sorted for deterministic output. Keys that do not match the
 * strict attribute-name allowlist are skipped entirely so a malformed
 * (untrusted) key can never be emitted verbatim.
 */
function buildAttrs(attrs: Record<string, string>): string {
  const keys = Object.keys(attrs)
    .filter((k) => ATTR_KEY_ALLOWED.test(k))
    .sort();
  if (keys.length === 0) return "";
  return " " + keys.map((k) => `${k}="${escapeAttr(attrs[k])}"`).join(" ");
}

// =============================================================================
// Node → HTML
// =============================================================================

/**
 * Build HTML attributes for a UINode based on its role and properties.
 */
function nodeAttrs(node: UINode, options: Required<EmitHTMLOptions>): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Role class
  if (options.includeRoleClass) {
    attrs["class"] = `wsk-${node.role.toLowerCase()}`;
  }

  // Semantic hint
  if (options.includeSemantics && node.semantic) {
    attrs["data-wsk-semantic"] = node.semantic;
  }

  // Bbox
  if (options.includeBbox) {
    attrs["data-wsk-bbox"] = node.bbox.map((v) => v.toFixed(3)).join(",");
  }

  // Interactive / focusable
  if (node.enabled === false) {
    attrs["disabled"] = "disabled";
  }

  // Role-specific attributes
  switch (node.role) {
    case "LINK":
      attrs["href"] = "#";
      break;
    case "CHECKBOX":
      attrs["type"] = "checkbox";
      if (node.semantic) attrs["name"] = node.semantic;
      break;
    case "RADIO":
      attrs["type"] = "radio";
      if (node.semantic) attrs["name"] = node.semantic;
      break;
    case "INPUT":
      attrs["type"] = "text";
      if (node.semantic) attrs["placeholder"] = node.semantic;
      break;
    case "IMAGE":
      attrs["alt"] = node.semantic ?? node.role;
      attrs["src"] = "";
      break;
    case "MODAL":
      attrs["open"] = "open";
      break;
  }

  // Handler data attributes (concatenate multiple intents per event with ";")
  if (options.includeHandlers && node.handlers && node.handlers.length > 0) {
    const sorted = [...node.handlers].sort((a, b) =>
      a.event.localeCompare(b.event) || a.intent.localeCompare(b.intent)
    );
    const eventMap = new Map<string, string[]>();
    for (const h of sorted) {
      const suffix = h.target ? `${h.intent}:${h.target}` : h.intent;
      const key = `data-wsk-on-${h.event}`;
      if (!eventMap.has(key)) eventMap.set(key, []);
      eventMap.get(key)!.push(suffix);
    }
    for (const [key, values] of eventMap) {
      attrs[key] = values.join("; ");
    }
  }

  // Binding data attributes
  if (options.includeBindings && node.bindings && node.bindings.length > 0) {
    const sorted = [...node.bindings].sort((a, b) => a.property.localeCompare(b.property));
    for (const b of sorted) {
      // Sanitize the dynamic key fragment so the attribute name is always
      // well-formed (defense in depth alongside buildAttrs's allowlist).
      attrs[`data-wsk-bind-${sanitizeAttrKeyPart(b.property)}`] = b.expression;
    }
  }

  // State signal data attributes (key:access pairs)
  if (options.includeState && node.state && node.state.length > 0) {
    const sorted = [...node.state].sort((a, b) => a.key.localeCompare(b.key));
    const stateEntries = sorted.map(
      (s) => `${s.key}:${s.access}${s.scope ? `@${s.scope}` : ""}`
    );
    attrs["data-wsk-state"] = stateEntries.join("; ");
  }

  // Style intent data attributes
  if (options.includeStyle && node.style) {
    if (node.style.tokens.length > 0) {
      attrs["data-wsk-style"] = [...node.style.tokens].sort().join(" ");
    }
    if (node.style.density) {
      attrs["data-wsk-density"] = node.style.density;
    }
    if (node.style.size) {
      attrs["data-wsk-size"] = node.style.size;
    }
  }

  // Pattern signal data attributes
  if (options.includePattern && node.pattern) {
    attrs["data-wsk-pattern"] = node.pattern.kind;
    if (node.pattern.name) {
      attrs["data-wsk-pattern-name"] = node.pattern.name;
    }
    if (node.pattern.variant) {
      attrs["data-wsk-pattern-variant"] = node.pattern.variant;
    }
    if (node.pattern.slot) {
      attrs["data-wsk-pattern-slot"] = node.pattern.slot;
    }
  }

  return attrs;
}

/**
 * Determine text content for a node.
 */
function nodeTextContent(node: UINode): string | undefined {
  if (node.role === "BUTTON" || node.role === "LINK") {
    return node.semantic ?? node.role;
  }
  if (node.role === "TEXT") {
    if (node.text?.kind === "short") return node.semantic ?? "…";
    if (node.text?.kind === "sentence") return node.semantic ?? "Lorem ipsum.";
    if (node.text?.kind === "paragraph") return node.semantic ?? "Lorem ipsum dolor sit amet.";
    return node.semantic ?? "…";
  }
  return undefined;
}

/**
 * Render a single UINode to HTML, recursively processing children.
 */
function renderNode(
  node: UINode,
  depth: number,
  options: Required<EmitHTMLOptions>,
): string {
  const tag = ROLE_TO_ELEMENT[node.role] ?? 'div';
  const attrs = nodeAttrs(node, options);
  if (!ROLE_TO_ELEMENT[node.role]) {
    attrs["data-wsk-unmapped-role"] = String(node.role);
  }
  const attrStr = buildAttrs(attrs);
  const pad = options.indent.repeat(depth);
  const isVoid = VOID_ELEMENTS.has(tag);
  const lines: string[] = [];

  if (isVoid) {
    lines.push(`${pad}<${tag}${attrStr} />`);
    return lines.join("\n");
  }

  // Open tag
  const textContent = nodeTextContent(node);
  const hasChildren = node.children && node.children.length > 0;

  if (!hasChildren && textContent !== undefined) {
    // Inline text for simple leaf nodes
    lines.push(`${pad}<${tag}${attrStr}>${escapeHTML(textContent)}</${tag}>`);
  } else if (!hasChildren) {
    lines.push(`${pad}<${tag}${attrStr}></${tag}>`);
  } else {
    lines.push(`${pad}<${tag}${attrStr}>`);

    // Render children
    const children = node.children ?? [];
    for (const child of children) {
      if (node.role === "LIST") {
        // Wrap list children in <li>
        const childHTML = renderNode(child, depth + 2, options);
        lines.push(`${options.indent.repeat(depth + 1)}<li>`);
        lines.push(childHTML);
        lines.push(`${options.indent.repeat(depth + 1)}</li>`);
      } else if (node.role === "TABLE") {
        // Wrap table children in <tr><td>
        const childHTML = renderNode(child, depth + 3, options);
        lines.push(`${options.indent.repeat(depth + 1)}<tr>`);
        lines.push(`${options.indent.repeat(depth + 2)}<td>`);
        lines.push(childHTML);
        lines.push(`${options.indent.repeat(depth + 2)}</td>`);
        lines.push(`${options.indent.repeat(depth + 1)}</tr>`);
      } else {
        lines.push(renderNode(child, depth + 1, options));
      }
    }

    lines.push(`${pad}</${tag}>`);
  }

  return lines.join("\n");
}

// =============================================================================
// Public API
// =============================================================================

const DEFAULT_OPTIONS: Required<EmitHTMLOptions> = {
  indent: "  ",
  includeBbox: true,
  includeHandlers: true,
  includeBindings: true,
  includeState: true,
  includeStyle: true,
  includePattern: true,
  includeSemantics: true,
  fullDocument: false,
  includeRoleClass: true,
};

/**
 * Emit semantic HTML from a WebSketchCapture.
 *
 * @example
 * ```ts
 * const html = emitHTML(capture);
 * // <main class="wsk-page" data-wsk-bbox="0.000,0.000,1.000,1.000">
 * //   <nav class="wsk-nav" ...>
 * //     <button class="wsk-button" data-wsk-on-click="toggle_menu">BUTTON</button>
 * //   </nav>
 * // </main>
 * ```
 */
export function emitHTML(
  capture: WebSketchCapture,
  options?: EmitHTMLOptions,
): string {
  const opts: Required<EmitHTMLOptions> = { ...DEFAULT_OPTIONS, ...options };
  const body = renderNode(capture.root, opts.fullDocument ? 2 : 0, opts);

  if (!opts.fullDocument) {
    return body;
  }

  return [
    "<!DOCTYPE html>",
    `<html lang="en">`,
    `${opts.indent}<head>`,
    `${opts.indent}${opts.indent}<meta charset="utf-8" />`,
    `${opts.indent}${opts.indent}<meta name="viewport" content="width=${escapeAttr(String(Math.max(0, Math.floor(Number(capture.viewport.w_px) || 0))))}, height=${escapeAttr(String(Math.max(0, Math.floor(Number(capture.viewport.h_px) || 0))))}" />`,
    `${opts.indent}${opts.indent}<title>${escapeHTML(capture.url)}</title>`,
    `${opts.indent}</head>`,
    `${opts.indent}<body>`,
    body,
    `${opts.indent}</body>`,
    "</html>",
  ].join("\n");
}

/**
 * Emit HTML for a single UINode (without capture wrapper).
 * Useful for rendering subtrees.
 */
export function emitNodeHTML(
  node: UINode,
  options?: EmitHTMLOptions,
): string {
  if (!node) return '';
  const opts: Required<EmitHTMLOptions> = { ...DEFAULT_OPTIONS, ...options };
  return renderNode(node, 0, opts);
}

/**
 * Get the HTML element name for a UIRole.
 */
export function roleToElement(role: UIRole): string {
  const element = ROLE_TO_ELEMENT[role];
  if (!element) {
    return 'div';
  }
  return element;
}
