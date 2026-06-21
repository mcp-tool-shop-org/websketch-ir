/**
 * WebSketch IR v0.1 - Markdown Renderer
 *
 * Renders a WebSketchCapture to clean, readable Markdown.
 * Maps UIRoles to idiomatic Markdown constructs so the output
 * can be consumed by LLMs, pasted into docs, or diffed as text.
 *
 * @module render/markdown
 */

import type { UINode, UIRole, WebSketchCapture } from "../grammar.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for the Markdown renderer.
 */
export interface RenderMarkdownOptions {
  /** Maximum tree depth to render (default: 50) */
  maxDepth?: number;
  /** Include URL and viewport metadata as a header block (default: false) */
  includeMetadata?: boolean;
  /** Number of spaces per indent level (default: 2) */
  indentSize?: number;
}

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_OPTIONS: Required<RenderMarkdownOptions> = {
  maxDepth: 50,
  includeMetadata: false,
  indentSize: 2,
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Escape markdown-significant characters in untrusted inline text so it
 * cannot break out of table cells, links, headers, bold, or list items.
 * Strips/escapes: pipe, backtick, square brackets, leading block markers
 * (#/>/-/*), and collapses newlines. Kept minimal to avoid over-escaping
 * normal prose.
 */
function escapeMd(value: string): string {
  return value
    // Collapse any newlines to spaces so a single value stays on one line.
    .replace(/[\r\n]+/g, " ")
    // Escape inline-significant characters.
    .replace(/([|`[\]])/g, "\\$1")
    // Strip leading block-level markers that would change the line's meaning.
    .replace(/^[\s]*[#>*-]+\s?/, "")
    .trim();
}

/** Extract a short display label from a node (markdown-escaped). */
function nodeText(node: UINode): string {
  if (node.semantic) return escapeMd(node.semantic);
  if (node.text?.kind !== "none" && node.text?.len) return `(${node.text.len} chars)`;
  return "";
}

// =============================================================================
// Per-Role Renderers
// =============================================================================

/**
 * Render a single node to Markdown lines.
 * Returns an array of strings (one per output line).
 */
function renderNode(
  node: UINode,
  depth: number,
  opts: Required<RenderMarkdownOptions>,
): string[] {
  if (depth > opts.maxDepth) return [];

  const lines: string[] = [];
  const label = nodeText(node);
  const kids = node.children ?? [];

  switch (node.role) {
    // ── Layout ──────────────────────────────────────────────────────────
    case "PAGE": {
      // Top-level document: just render children
      for (const child of kids) {
        lines.push(...renderNode(child, depth, opts));
      }
      break;
    }

    case "HEADER": {
      lines.push(`## ${label || "Header"}`);
      lines.push("");
      for (const child of kids) {
        lines.push(...renderNode(child, depth + 1, opts));
      }
      break;
    }

    case "SECTION": {
      lines.push(`### ${label || "Section"}`);
      lines.push("");
      for (const child of kids) {
        lines.push(...renderNode(child, depth + 1, opts));
      }
      break;
    }

    case "NAV": {
      if (label) lines.push(`**${label}**`);
      lines.push("");
      for (const child of kids) {
        const childLabel = nodeText(child) || child.role;
        lines.push(`- ${childLabel}`);
      }
      lines.push("");
      break;
    }

    case "FOOTER": {
      lines.push("---");
      lines.push("");
      if (label) lines.push(`*${label}*`);
      for (const child of kids) {
        lines.push(...renderNode(child, depth + 1, opts));
      }
      lines.push("");
      break;
    }

    // ── Lists & Tables ──────────────────────────────────────────────────
    case "LIST": {
      if (label) lines.push(`**${label}**`);
      lines.push("");
      for (const child of kids) {
        const itemLabel = nodeText(child) || child.role;
        lines.push(`- ${itemLabel}`);
      }
      lines.push("");
      break;
    }

    case "TABLE": {
      if (label) lines.push(`**${label}**`);
      lines.push("");
      if (kids.length > 0) {
        // Treat first child row as header, rest as body.
        let headerCells = (kids[0].children ?? []).map(
          (c) => nodeText(c) || c.role,
        );
        let bodyStart = 1;

        // If the first row has no cells, the table would be silently dropped.
        // Fall back to the row with the most cells for the header so the body
        // still renders; if no row has cells, synthesize a generic header.
        if (headerCells.length === 0) {
          let widest = -1;
          let widestCount = 0;
          for (let i = 0; i < kids.length; i++) {
            const count = (kids[i].children ?? []).length;
            if (count > widestCount) {
              widestCount = count;
              widest = i;
            }
          }
          if (widest >= 0 && widestCount > 0) {
            headerCells = (kids[widest].children ?? []).map(
              (c) => nodeText(c) || c.role,
            );
            bodyStart = widest + 1;
          } else {
            headerCells = ["Column"];
            bodyStart = 0;
          }
        }

        if (headerCells.length > 0) {
          const width = headerCells.length;
          lines.push(`| ${headerCells.join(" | ")} |`);
          lines.push(`| ${headerCells.map(() => "---").join(" | ")} |`);
          for (let i = bodyStart; i < kids.length; i++) {
            const raw = (kids[i].children ?? []).map(
              (c) => nodeText(c) || c.role,
            );
            // Pad/truncate body rows to the header width so the table is valid.
            const cells = raw.slice(0, width);
            while (cells.length < width) cells.push("");
            lines.push(`| ${cells.join(" | ")} |`);
          }
        }
      }
      lines.push("");
      break;
    }

    // ── Interactive ─────────────────────────────────────────────────────
    case "BUTTON": {
      lines.push(`**[${label || "Button"}]**`);
      break;
    }

    case "LINK": {
      lines.push(`[${label || "Link"}](#)`);
      break;
    }

    case "INPUT": {
      lines.push(`[_${label || "input field"}_]`);
      break;
    }

    case "CHECKBOX": {
      lines.push(`- [ ] ${label || "checkbox"}`);
      break;
    }

    case "RADIO": {
      lines.push(`- ( ) ${label || "radio"}`);
      break;
    }

    case "DROPDOWN": {
      lines.push(`[_${label || "dropdown"}_] ▾`);
      break;
    }

    case "FORM": {
      lines.push(`#### ${label || "Form"}`);
      lines.push("");
      for (const child of kids) {
        lines.push(...renderNode(child, depth + 1, opts));
      }
      lines.push("");
      break;
    }

    // ── Content ─────────────────────────────────────────────────────────
    case "TEXT": {
      lines.push(label || "(text)");
      lines.push("");
      break;
    }

    case "IMAGE": {
      lines.push(`![${label || "image"}]()`);
      lines.push("");
      break;
    }

    case "ICON": {
      lines.push(`🔹 ${label || "icon"}`);
      break;
    }

    // ── Containers ──────────────────────────────────────────────────────
    case "CARD": {
      lines.push(`> **${label || "Card"}**`);
      for (const child of kids) {
        const childLines = renderNode(child, depth + 1, opts);
        for (const cl of childLines) {
          lines.push(`> ${cl}`);
        }
      }
      lines.push("");
      break;
    }

    case "MODAL": {
      lines.push("---");
      lines.push(`**[Modal: ${label || "dialog"}]**`);
      lines.push("");
      for (const child of kids) {
        lines.push(...renderNode(child, depth + 1, opts));
      }
      lines.push("---");
      lines.push("");
      break;
    }

    case "TOAST": {
      lines.push(`> ⚠ ${label || "notification"}`);
      lines.push("");
      break;
    }

    case "PAGINATION": {
      const pageItems = kids.map((c) => nodeText(c) || "·");
      lines.push(`[${pageItems.join(" | ")}]`);
      lines.push("");
      break;
    }

    // ── Fallback ────────────────────────────────────────────────────────
    default: {
      const roleName: UIRole = node.role;
      if (label) {
        lines.push(`**${roleName}:** ${label}`);
      } else {
        lines.push(`**${roleName}**`);
      }
      for (const child of kids) {
        lines.push(...renderNode(child, depth + 1, opts));
      }
      break;
    }
  }

  return lines;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a WebSketchCapture to clean Markdown.
 */
export function renderMarkdown(
  capture: WebSketchCapture,
  options: RenderMarkdownOptions = {},
): string {
  const opts: Required<RenderMarkdownOptions> = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  if (opts.includeMetadata) {
    // Guard against non-finite / out-of-range timestamps so toISOString()
    // never throws a RangeError on bad capture metadata.
    const t = Number(capture.timestamp_ms);
    const stamp = Number.isFinite(t) ? new Date(t).toISOString() : "unknown";

    lines.push(`> **URL:** ${escapeMd(capture.url)}`);
    lines.push(
      `> **Viewport:** ${escapeMd(String(capture.viewport.w_px))}x${escapeMd(String(capture.viewport.h_px))}`,
    );
    lines.push(`> **Captured:** ${stamp}`);
    lines.push("");
  }

  lines.push(...renderNode(capture.root, 0, opts));

  // Trim trailing blank lines, ensure single trailing newline
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  return lines.join("\n") + "\n";
}
