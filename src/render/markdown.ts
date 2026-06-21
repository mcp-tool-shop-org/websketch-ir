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

/** Extract a short display label from a node. */
function nodeText(node: UINode): string {
  if (node.semantic) return node.semantic;
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
        // Treat first child row as header, rest as body
        const headerCells = (kids[0].children ?? []).map(
          (c) => nodeText(c) || c.role,
        );
        if (headerCells.length > 0) {
          lines.push(`| ${headerCells.join(" | ")} |`);
          lines.push(`| ${headerCells.map(() => "---").join(" | ")} |`);
          for (let i = 1; i < kids.length; i++) {
            const cells = (kids[i].children ?? []).map(
              (c) => nodeText(c) || c.role,
            );
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
    lines.push(`> **URL:** ${capture.url}`);
    lines.push(
      `> **Viewport:** ${capture.viewport.w_px}x${capture.viewport.h_px}`,
    );
    lines.push(
      `> **Captured:** ${new Date(capture.timestamp_ms).toISOString()}`,
    );
    lines.push("");
  }

  lines.push(...renderNode(capture.root, 0, opts));

  // Trim trailing blank lines, ensure single trailing newline
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  return lines.join("\n") + "\n";
}
