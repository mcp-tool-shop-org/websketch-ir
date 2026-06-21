/**
 * WebSketch IR v0.1 - Code Generation Module
 *
 * Subsystem responsible for converting WebSketchCapture trees into
 * consumable output formats:
 *
 * - **HTML** (`emitHTML`) — semantic HTML5 with data attributes for
 *   handler intents, bindings, state, style, and pattern signals.
 * - **ASCII** (`renderAscii`, re-exported from `render/ascii`) — fixed-
 *   size character grid for LLM consumption without vision models.
 * - **LLM** (`renderForLLM`, re-exported from `render/ascii`) — ASCII
 *   grid wrapped with capture metadata and a role legend.
 * - **JSON** (`renderJSON`, re-exported from `render/json`) — minimal
 *   JSON tree for LLM tool-calling consumption.
 *
 * To add a new renderer, implement a function that accepts a
 * `WebSketchCapture` and returns a string, then register it in the
 * `RENDERERS` map exported below.
 *
 * @module codegen
 */

export type { EmitHTMLOptions } from "./html.js";
export { emitHTML, emitNodeHTML, roleToElement } from "./html.js";

export type { RenderForLLMOptions } from "../render/ascii.js";
export {
  renderAscii,
  renderForLLM,
  renderStructure,
  renderNodeAscii,
  generateLegend,
} from "../render/ascii.js";

export type { RenderJSONOptions, JSONNode, RenderJSONFlatEntry } from "../render/json.js";
export { renderJSON, renderJSONFlat } from "../render/json.js";

export type { RenderMarkdownOptions } from "../render/markdown.js";
export { renderMarkdown } from "../render/markdown.js";

export { formatDiffForLLM } from "../diff.js";

import { emitHTML } from "./html.js";
import { renderAscii, renderForLLM } from "../render/ascii.js";
import { renderJSON } from "../render/json.js";
import { renderMarkdown } from "../render/markdown.js";
import type { WebSketchCapture } from "../grammar.js";

/**
 * Registry of built-in renderers keyed by short name.
 * Useful for dynamic renderer selection (e.g. CLI `--format` flag).
 */
export const RENDERERS: Record<string, (capture: WebSketchCapture) => string> = {
  html: (capture) => emitHTML(capture),
  ascii: (capture) => renderAscii(capture),
  llm: renderForLLM,
  json: (capture) => renderJSON(capture),
  markdown: (capture) => renderMarkdown(capture),
};
