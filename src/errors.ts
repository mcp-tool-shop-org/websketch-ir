/**
 * WebSketch IR v0.1 - Error Types & Validation
 *
 * Canonical error taxonomy for the WebSketch ecosystem.
 * Zero dependencies. Hand-rolled schema validation.
 */

import type { UIRole, WebSketchCapture } from "./grammar.js";

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Canonical error codes for the WebSketch ecosystem.
 * Every consumer (CLI, MCP, extension, demo) maps to these.
 */
export type WebSketchErrorCode =
  | "WS_INVALID_JSON"
  | "WS_INVALID_CAPTURE"
  | "WS_INVALID_ARGS"
  | "WS_UNSUPPORTED_VERSION"
  | "WS_LIMIT_EXCEEDED"
  | "WS_NOT_FOUND"
  | "WS_PERMISSION_DENIED"
  | "WS_IO_ERROR"
  | "WS_INTERNAL";

// =============================================================================
// Error Types
// =============================================================================

/**
 * Structured error envelope.
 * Every error surfaced to users carries these fields.
 */
export interface WebSketchError {
  code: WebSketchErrorCode;
  message: string;
  details?: string;
  path?: string;
  expected?: string;
  received?: string;
  hint?: string;
  cause?: { name: string; message: string };
}

/**
 * A single validation issue found during capture validation.
 */
export interface WebSketchValidationIssue {
  path: string;
  expected: string;
  received: string;
  message: string;
}

/**
 * Validation error with array of individual issues.
 */
export interface WebSketchValidationError extends WebSketchError {
  code: "WS_INVALID_CAPTURE";
  issues: WebSketchValidationIssue[];
}

/**
 * Resource limits for validation.
 */
export interface WebSketchLimits {
  maxNodes: number;
  maxDepth: number;
  maxStringLength: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Default resource limits. */
export const DEFAULT_LIMITS: WebSketchLimits = {
  maxNodes: 10_000,
  maxDepth: 50,
  maxStringLength: 10_000,
};

/** All valid UIRole values (kept in sync with grammar.ts). */
const VALID_ROLES: ReadonlySet<string> = new Set<UIRole>([
  "PAGE", "NAV", "HEADER", "FOOTER", "SECTION", "CARD", "LIST", "TABLE",
  "MODAL", "TOAST", "DROPDOWN",
  "FORM", "INPUT", "BUTTON", "LINK", "CHECKBOX", "RADIO", "ICON",
  "IMAGE", "TEXT",
  "PAGINATION",
  "UNKNOWN",
]);

// =============================================================================
// Exception Class
// =============================================================================

/**
 * Throwable error carrying a structured WebSketchError payload.
 */
export class WebSketchException extends Error {
  readonly ws: WebSketchError;

  constructor(ws: WebSketchError) {
    super(ws.message);
    this.name = "WebSketchException";
    this.ws = ws;
    if (ws.cause) {
      this.cause = new Error(ws.cause.message);
    }
  }
}

// =============================================================================
// Validation Helpers
// =============================================================================

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function issue(path: string, expected: string, received: string, message: string): WebSketchValidationIssue {
  return { path, expected, received, message };
}

// =============================================================================
// Node Validation (recursive)
// =============================================================================

function validateNode(
  data: unknown,
  path: string,
  depth: number,
  state: { nodeCount: number },
  limits: WebSketchLimits,
  issues: WebSketchValidationIssue[],
): void {
  // Limit checks (early exit)
  state.nodeCount++;
  if (state.nodeCount > limits.maxNodes) {
    issues.push(issue(path, `<= ${limits.maxNodes} nodes`, `${state.nodeCount}+`, `Node count exceeds maxNodes limit (${limits.maxNodes})`));
    return;
  }
  if (depth > limits.maxDepth) {
    issues.push(issue(path, `depth <= ${limits.maxDepth}`, `depth ${depth}`, `Tree depth exceeds maxDepth limit (${limits.maxDepth})`));
    return;
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    issues.push(issue(path, "object", typeOf(data), "Node must be an object"));
    return;
  }

  const node = data as Record<string, unknown>;

  // role (required, must be valid UIRole)
  if (typeof node.role !== "string") {
    issues.push(issue(`${path}.role`, "string (UIRole)", typeOf(node.role), "Node role is required and must be a string"));
  } else if (!VALID_ROLES.has(node.role)) {
    issues.push(issue(`${path}.role`, `one of [${[...VALID_ROLES].join(", ")}]`, `"${node.role}"`, `Invalid UI role: "${node.role}"`));
  }

  // bbox (required, 4-element number array)
  if (!Array.isArray(node.bbox)) {
    issues.push(issue(`${path}.bbox`, "array of 4 numbers", typeOf(node.bbox), "Node bbox is required and must be an array"));
  } else if (node.bbox.length !== 4) {
    issues.push(issue(`${path}.bbox`, "array of 4 numbers", `array of ${node.bbox.length}`, "Node bbox must have exactly 4 elements"));
  } else {
    for (let i = 0; i < 4; i++) {
      if (typeof node.bbox[i] !== "number") {
        issues.push(issue(`${path}.bbox[${i}]`, "number", typeOf(node.bbox[i]), `bbox element ${i} must be a number`));
      }
    }
  }

  // interactive (required, boolean)
  if (typeof node.interactive !== "boolean") {
    issues.push(issue(`${path}.interactive`, "boolean", typeOf(node.interactive), "Node interactive is required and must be a boolean"));
  }

  // visible (required, boolean)
  if (typeof node.visible !== "boolean") {
    issues.push(issue(`${path}.visible`, "boolean", typeOf(node.visible), "Node visible is required and must be a boolean"));
  }

  // id (required, string — may be empty)
  if (typeof node.id !== "string") {
    issues.push(issue(`${path}.id`, "string", typeOf(node.id), "Node id is required and must be a string"));
  }

  // text (optional, but if present must have 'kind')
  if (node.text !== undefined) {
    if (typeof node.text !== "object" || node.text === null || Array.isArray(node.text)) {
      issues.push(issue(`${path}.text`, "TextSignal object", typeOf(node.text), "Node text must be a TextSignal object"));
    } else {
      const text = node.text as Record<string, unknown>;
      if (typeof text.kind !== "string") {
        issues.push(issue(`${path}.text.kind`, "string (TextKind)", typeOf(text.kind), "TextSignal kind is required"));
      }
    }
  }

  // children (optional, but if present must be array of nodes)
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      issues.push(issue(`${path}.children`, "array", typeOf(node.children), "Node children must be an array"));
    } else {
      for (let i = 0; i < node.children.length; i++) {
        validateNode(node.children[i], `${path}.children[${i}]`, depth + 1, state, limits, issues);
        // Stop collecting issues if we have too many
        if (issues.length > 100) return;
      }
    }
  }
}

// =============================================================================
// Capture Validation
// =============================================================================

/**
 * Validate a parsed object against the WebSketchCapture schema.
 * Returns an array of validation issues (empty = valid).
 * Does NOT throw — callers decide how to handle issues.
 */
export function validateCapture(
  data: unknown,
  limits?: Partial<WebSketchLimits>,
): WebSketchValidationIssue[] {
  const resolvedLimits: WebSketchLimits = { ...DEFAULT_LIMITS, ...limits };
  const issues: WebSketchValidationIssue[] = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    issues.push(issue("", "object", typeOf(data), "Capture must be an object"));
    return issues;
  }

  const obj = data as Record<string, unknown>;

  // version (required, must be "0.1")
  if (typeof obj.version !== "string") {
    issues.push(issue("version", '"0.1"', typeOf(obj.version), "Capture version is required"));
  } else if (obj.version !== "0.1") {
    issues.push(issue("version", '"0.1"', `"${obj.version}"`, `Unsupported version: "${obj.version}"`));
  }

  // url (required, string)
  if (typeof obj.url !== "string") {
    issues.push(issue("url", "string", typeOf(obj.url), "Capture url is required"));
  }

  // timestamp_ms (required, number)
  if (typeof obj.timestamp_ms !== "number") {
    issues.push(issue("timestamp_ms", "number", typeOf(obj.timestamp_ms), "Capture timestamp_ms is required"));
  }

  // viewport (required, object with w_px, h_px, aspect)
  if (typeof obj.viewport !== "object" || obj.viewport === null || Array.isArray(obj.viewport)) {
    issues.push(issue("viewport", "ViewportMeta object", typeOf(obj.viewport), "Capture viewport is required"));
  } else {
    const vp = obj.viewport as Record<string, unknown>;
    if (typeof vp.w_px !== "number") {
      issues.push(issue("viewport.w_px", "number", typeOf(vp.w_px), "Viewport w_px is required"));
    }
    if (typeof vp.h_px !== "number") {
      issues.push(issue("viewport.h_px", "number", typeOf(vp.h_px), "Viewport h_px is required"));
    }
    if (typeof vp.aspect !== "number") {
      issues.push(issue("viewport.aspect", "number", typeOf(vp.aspect), "Viewport aspect is required"));
    }
  }

  // compiler (required, object with name, version, options_hash)
  if (typeof obj.compiler !== "object" || obj.compiler === null || Array.isArray(obj.compiler)) {
    issues.push(issue("compiler", "CompilerMeta object", typeOf(obj.compiler), "Capture compiler is required"));
  } else {
    const comp = obj.compiler as Record<string, unknown>;
    if (typeof comp.name !== "string") {
      issues.push(issue("compiler.name", "string", typeOf(comp.name), "Compiler name is required"));
    }
    if (typeof comp.version !== "string") {
      issues.push(issue("compiler.version", "string", typeOf(comp.version), "Compiler version is required"));
    }
    if (typeof comp.options_hash !== "string") {
      issues.push(issue("compiler.options_hash", "string", typeOf(comp.options_hash), "Compiler options_hash is required"));
    }
  }

  // root (required, UINode)
  if (obj.root === undefined || obj.root === null) {
    issues.push(issue("root", "UINode object", typeOf(obj.root), "Capture root node is required"));
  } else {
    const state = { nodeCount: 0 };
    validateNode(obj.root, "root", 0, state, resolvedLimits, issues);
  }

  return issues;
}

// =============================================================================
// Parse + Validate (strict)
// =============================================================================

/**
 * Parse a JSON string into a validated WebSketchCapture.
 * Throws WebSketchException on any error:
 * - SyntaxError → WS_INVALID_JSON
 * - Schema violation → WS_INVALID_CAPTURE (with issues array)
 * - Unsupported version → WS_UNSUPPORTED_VERSION
 */
export function parseCapture(
  json: string,
  limits?: Partial<WebSketchLimits>,
): WebSketchCapture {
  // Step 1: Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new WebSketchException({
      code: "WS_INVALID_JSON",
      message: "Failed to parse JSON",
      details: (err as Error).message,
      hint: "Ensure the input is valid JSON. Check for trailing commas, unquoted keys, or missing brackets.",
      cause: { name: (err as Error).name, message: (err as Error).message },
    });
  }

  // Step 2: Validate schema
  const issues = validateCapture(data, limits);

  if (issues.length > 0) {
    // Check if it's a version issue specifically
    const versionIssue = issues.find((i) => i.path === "version" && i.received !== "undefined");
    if (versionIssue && versionIssue.received !== '"0.1"') {
      throw new WebSketchException({
        code: "WS_UNSUPPORTED_VERSION",
        message: `Unsupported capture version: ${versionIssue.received}`,
        expected: '"0.1"',
        received: versionIssue.received,
        hint: "This version of websketch-ir only supports version 0.1 captures.",
      });
    }

    // Check if it's a limit exceeded issue
    const limitIssue = issues.find(
      (i) => i.message.includes("exceeds maxNodes") || i.message.includes("exceeds maxDepth"),
    );
    if (limitIssue) {
      throw new WebSketchException({
        code: "WS_LIMIT_EXCEEDED",
        message: limitIssue.message,
        path: limitIssue.path,
        expected: limitIssue.expected,
        received: limitIssue.received,
        hint: "The capture exceeds configured resource limits. Try increasing limits or reducing capture complexity.",
      });
    }

    // General validation error
    const wsError: WebSketchValidationError = {
      code: "WS_INVALID_CAPTURE",
      message: `Invalid capture: ${issues.length} validation issue${issues.length > 1 ? "s" : ""} found`,
      details: issues.slice(0, 5).map((i) => `${i.path}: ${i.message}`).join("; "),
      hint: "Check the capture JSON against the WebSketchCapture schema.",
      issues,
    };
    throw new WebSketchException(wsError);
  }

  return data as WebSketchCapture;
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format a WebSketchError for human-readable display.
 */
export function formatWebSketchError(err: WebSketchError): string {
  const lines: string[] = [];

  lines.push(`[${err.code}] ${err.message}`);

  if (err.details) {
    lines.push(`  Details: ${err.details}`);
  }
  if (err.path) {
    lines.push(`  Path: ${err.path}`);
  }
  if (err.expected && err.received) {
    lines.push(`  Expected: ${err.expected}`);
    lines.push(`  Received: ${err.received}`);
  }
  if (err.hint) {
    lines.push(`  Hint: ${err.hint}`);
  }
  if (err.cause) {
    lines.push(`  Cause: ${err.cause.name}: ${err.cause.message}`);
  }

  return lines.join("\n");
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard: check if an unknown error is a WebSketchException.
 */
export function isWebSketchException(err: unknown): err is WebSketchException {
  return err instanceof WebSketchException;
}
