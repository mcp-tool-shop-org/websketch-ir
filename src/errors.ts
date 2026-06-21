/**
 * WebSketch IR v0.1 - Error Types & Validation
 *
 * Canonical error taxonomy for the WebSketch ecosystem.
 * Zero dependencies. Hand-rolled schema validation.
 */

import type { UIRole, WebSketchCapture } from "./grammar.js";
import {
  VALID_EVENT_TYPES,
  VALID_STATE_ACCESS_KINDS,
  VALID_STATE_SCOPES,
  VALID_STYLE_INTENT_TOKENS,
  VALID_DENSITIES,
  VALID_SIZES,
  VALID_PATTERN_KINDS,
} from "./grammar.js";
import { isSupportedSchemaVersion, SUPPORTED_SCHEMA_VERSIONS } from "./compat.js";

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
  state: { nodeCount: number; limitViolations: number },
  limits: WebSketchLimits,
  issues: WebSketchValidationIssue[],
  visited?: WeakSet<object>,
): void {
  // Circular reference guard
  if (typeof data === "object" && data !== null) {
    const seen = visited ?? new WeakSet<object>();
    if (seen.has(data)) {
      issues.push(issue(path, "acyclic tree", "circular reference", "Node contains a circular reference"));
      return;
    }
    seen.add(data);
    // eslint-disable-next-line no-param-reassign
    visited = seen;
  }

  // Limit checks (collect up to 3 violations before bailing out)
  state.nodeCount++;
  if (state.nodeCount > limits.maxNodes) {
    state.limitViolations++;
    issues.push(issue(path, `<= ${limits.maxNodes} nodes`, `${state.nodeCount}+`, `Node count exceeds maxNodes limit (${limits.maxNodes})`));
    if (state.limitViolations >= 3) return;
    return;
  }
  if (depth > limits.maxDepth) {
    state.limitViolations++;
    issues.push(issue(path, `depth <= ${limits.maxDepth}`, `depth ${depth}`, `Tree depth exceeds maxDepth limit (${limits.maxDepth})`));
    if (state.limitViolations >= 3) return;
    return;
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    issues.push(issue(path, "object", typeOf(data), "Node must be an object"));
    return;
  }

  const node = data as Record<string, unknown>;

  // Guard against prototype pollution keys in untrusted input.
  if (Object.hasOwn(node, "__proto__") || Object.hasOwn(node, "constructor") || Object.hasOwn(node, "prototype")) {
    issues.push(issue(path, "plain object", "object with prohibited keys", "Node contains __proto__, constructor, or prototype key"));
    return;
  }

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

  // handlers (optional, but if present must be array of HandlerSignal)
  if (node.handlers !== undefined) {
    if (!Array.isArray(node.handlers)) {
      issues.push(issue(`${path}.handlers`, "array", typeOf(node.handlers), "Node handlers must be an array"));
    } else {
      for (let i = 0; i < node.handlers.length; i++) {
        const h = node.handlers[i] as unknown;
        const hp = `${path}.handlers[${i}]`;
        if (typeof h !== "object" || h === null || Array.isArray(h)) {
          issues.push(issue(hp, "HandlerSignal object", typeOf(h), "Handler must be an object"));
        } else {
          const hObj = h as Record<string, unknown>;
          if (typeof hObj.event !== "string") {
            issues.push(issue(`${hp}.event`, "string (EventType)", typeOf(hObj.event), "Handler event is required"));
          } else if (!VALID_EVENT_TYPES.has(hObj.event)) {
            issues.push(issue(`${hp}.event`, `one of [${[...VALID_EVENT_TYPES].join(", ")}]`, `"${hObj.event}"`, `Invalid event type: "${hObj.event}"`));
          }
          if (typeof hObj.intent !== "string") {
            issues.push(issue(`${hp}.intent`, "string", typeOf(hObj.intent), "Handler intent is required"));
          } else if (hObj.intent.length > limits.maxStringLength) {
            issues.push(issue(`${hp}.intent`, `<= ${limits.maxStringLength} chars`, `${hObj.intent.length}`, "Handler intent exceeds maxStringLength"));
          }
          if (hObj.target !== undefined && typeof hObj.target !== "string") {
            issues.push(issue(`${hp}.target`, "string | undefined", typeOf(hObj.target), "Handler target must be a string if present"));
          }
        }
      }
    }
  }

  // bindings (optional, but if present must be array of BindingSignal)
  if (node.bindings !== undefined) {
    if (!Array.isArray(node.bindings)) {
      issues.push(issue(`${path}.bindings`, "array", typeOf(node.bindings), "Node bindings must be an array"));
    } else {
      for (let i = 0; i < node.bindings.length; i++) {
        const b = node.bindings[i] as unknown;
        const bp = `${path}.bindings[${i}]`;
        if (typeof b !== "object" || b === null || Array.isArray(b)) {
          issues.push(issue(bp, "BindingSignal object", typeOf(b), "Binding must be an object"));
        } else {
          const bObj = b as Record<string, unknown>;
          if (typeof bObj.property !== "string") {
            issues.push(issue(`${bp}.property`, "string", typeOf(bObj.property), "Binding property is required"));
          } else if (bObj.property.length > limits.maxStringLength) {
            issues.push(issue(`${bp}.property`, `<= ${limits.maxStringLength} chars`, `${bObj.property.length}`, "Binding property exceeds maxStringLength"));
          }
          if (typeof bObj.expression !== "string") {
            issues.push(issue(`${bp}.expression`, "string", typeOf(bObj.expression), "Binding expression is required"));
          } else if (bObj.expression.length > limits.maxStringLength) {
            issues.push(issue(`${bp}.expression`, `<= ${limits.maxStringLength} chars`, `${bObj.expression.length}`, "Binding expression exceeds maxStringLength"));
          }
        }
      }
    }
  }

  // state (optional, but if present must be array of StateSignal)
  if (node.state !== undefined) {
    if (!Array.isArray(node.state)) {
      issues.push(issue(`${path}.state`, "array", typeOf(node.state), "Node state must be an array"));
    } else {
      for (let i = 0; i < node.state.length; i++) {
        const s = node.state[i] as unknown;
        const sp = `${path}.state[${i}]`;
        if (typeof s !== "object" || s === null || Array.isArray(s)) {
          issues.push(issue(sp, "StateSignal object", typeOf(s), "State signal must be an object"));
        } else {
          const sObj = s as Record<string, unknown>;
          if (typeof sObj.key !== "string") {
            issues.push(issue(`${sp}.key`, "string", typeOf(sObj.key), "StateSignal key is required"));
          } else if (sObj.key.length > limits.maxStringLength) {
            issues.push(issue(`${sp}.key`, `<= ${limits.maxStringLength} chars`, `${sObj.key.length}`, "StateSignal key exceeds maxStringLength"));
          }
          if (typeof sObj.access !== "string") {
            issues.push(issue(`${sp}.access`, "string (StateAccessKind)", typeOf(sObj.access), "StateSignal access is required"));
          } else if (!VALID_STATE_ACCESS_KINDS.has(sObj.access)) {
            issues.push(issue(`${sp}.access`, `one of [${[...VALID_STATE_ACCESS_KINDS].join(", ")}]`, `"${sObj.access}"`, `Invalid state access kind: "${sObj.access}"`));
          }
          if (sObj.scope !== undefined) {
            if (typeof sObj.scope !== "string") {
              issues.push(issue(`${sp}.scope`, "string | undefined", typeOf(sObj.scope), "StateSignal scope must be a string if present"));
            } else if (!VALID_STATE_SCOPES.has(sObj.scope)) {
              issues.push(issue(`${sp}.scope`, `one of [${[...VALID_STATE_SCOPES].join(", ")}]`, `"${sObj.scope}"`, `Invalid state scope: "${sObj.scope}"`));
            }
          }
        }
      }
    }
  }

  // style (optional, but if present must be a StyleIntent object)
  if (node.style !== undefined) {
    if (typeof node.style !== "object" || node.style === null || Array.isArray(node.style)) {
      issues.push(issue(`${path}.style`, "StyleIntent object", typeOf(node.style), "Node style must be a StyleIntent object"));
    } else {
      const st = node.style as Record<string, unknown>;
      if (!Array.isArray(st.tokens)) {
        issues.push(issue(`${path}.style.tokens`, "array of StyleIntentToken", typeOf(st.tokens), "StyleIntent tokens is required and must be an array"));
      } else {
        for (let i = 0; i < st.tokens.length; i++) {
          if (typeof st.tokens[i] !== "string") {
            issues.push(issue(`${path}.style.tokens[${i}]`, "string (StyleIntentToken)", typeOf(st.tokens[i]), "StyleIntent token must be a string"));
          } else if (!VALID_STYLE_INTENT_TOKENS.has(st.tokens[i] as string)) {
            issues.push(issue(`${path}.style.tokens[${i}]`, `one of [${[...VALID_STYLE_INTENT_TOKENS].join(", ")}]`, `"${st.tokens[i] as string}"`, `Invalid style intent token: "${st.tokens[i] as string}"`));
          }
        }
      }
      if (st.density !== undefined) {
        if (typeof st.density !== "string") {
          issues.push(issue(`${path}.style.density`, "string | undefined", typeOf(st.density), "StyleIntent density must be a string if present"));
        } else if (!VALID_DENSITIES.has(st.density)) {
          issues.push(issue(`${path}.style.density`, `one of [${[...VALID_DENSITIES].join(", ")}]`, `"${st.density}"`, `Invalid density: "${st.density}"`));
        }
      }
      if (st.size !== undefined) {
        if (typeof st.size !== "string") {
          issues.push(issue(`${path}.style.size`, "string | undefined", typeOf(st.size), "StyleIntent size must be a string if present"));
        } else if (!VALID_SIZES.has(st.size)) {
          issues.push(issue(`${path}.style.size`, `one of [${[...VALID_SIZES].join(", ")}]`, `"${st.size}"`, `Invalid size: "${st.size}"`));
        }
      }
    }
  }

  // pattern (optional, but if present must be a PatternSignal object)
  if (node.pattern !== undefined) {
    if (typeof node.pattern !== "object" || node.pattern === null || Array.isArray(node.pattern)) {
      issues.push(issue(`${path}.pattern`, "PatternSignal object", typeOf(node.pattern), "Node pattern must be a PatternSignal object"));
    } else {
      const pat = node.pattern as Record<string, unknown>;
      if (typeof pat.kind !== "string") {
        issues.push(issue(`${path}.pattern.kind`, "string (PatternKind)", typeOf(pat.kind), "PatternSignal kind is required"));
      } else if (!VALID_PATTERN_KINDS.has(pat.kind)) {
        issues.push(issue(`${path}.pattern.kind`, `one of [${[...VALID_PATTERN_KINDS].join(", ")}]`, `"${pat.kind}"`, `Invalid pattern kind: "${pat.kind}"`));
      }
      if (pat.name !== undefined) {
        if (typeof pat.name !== "string") {
          issues.push(issue(`${path}.pattern.name`, "string | undefined", typeOf(pat.name), "PatternSignal name must be a string if present"));
        } else if (pat.name.length > limits.maxStringLength) {
          issues.push(issue(`${path}.pattern.name`, `<= ${limits.maxStringLength} chars`, `${pat.name.length}`, "PatternSignal name exceeds maxStringLength"));
        }
      }
      if (pat.variant !== undefined) {
        if (typeof pat.variant !== "string") {
          issues.push(issue(`${path}.pattern.variant`, "string | undefined", typeOf(pat.variant), "PatternSignal variant must be a string if present"));
        } else if (pat.variant.length > limits.maxStringLength) {
          issues.push(issue(`${path}.pattern.variant`, `<= ${limits.maxStringLength} chars`, `${pat.variant.length}`, "PatternSignal variant exceeds maxStringLength"));
        }
      }
      if (pat.slot !== undefined) {
        if (typeof pat.slot !== "string") {
          issues.push(issue(`${path}.pattern.slot`, "string | undefined", typeOf(pat.slot), "PatternSignal slot must be a string if present"));
        } else if (pat.slot.length > limits.maxStringLength) {
          issues.push(issue(`${path}.pattern.slot`, `<= ${limits.maxStringLength} chars`, `${pat.slot.length}`, "PatternSignal slot exceeds maxStringLength"));
        }
      }
    }
  }

  // children (optional, but if present must be array of nodes)
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      issues.push(issue(`${path}.children`, "array", typeOf(node.children), "Node children must be an array"));
    } else {
      for (let i = 0; i < node.children.length; i++) {
        validateNode(node.children[i], `${path}.children[${i}]`, depth + 1, state, limits, issues, visited);
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
 *
 * Note: Issue collection is capped at 100 issues per call to bound
 * memory usage on deeply invalid inputs.
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

  // version (required, must be a supported schema version)
  if (typeof obj.version !== "string") {
    issues.push(issue("version", "string (schema version)", typeOf(obj.version), "Capture version is required"));
  } else {
    if (!isSupportedSchemaVersion(obj.version)) {
      issues.push(issue("version", "supported version", `"${obj.version as string}"`, `Unsupported version: "${obj.version as string}"`));
    }
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
    const state = { nodeCount: 0, limitViolations: 0 };
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
  // Step 0: Input size guard
  const maxInputLength = limits?.maxStringLength
    ? limits.maxStringLength * 100  // generous but bounded
    : DEFAULT_LIMITS.maxStringLength * 100;
  const inputLines = json.split("\n").length;
  const inputBytes = new TextEncoder().encode(json).byteLength;
  if (json.length > maxInputLength) {
    throw new WebSketchException({
      code: "WS_LIMIT_EXCEEDED",
      message: `Input JSON exceeds maximum length (${json.length} chars > ${maxInputLength} limit, ${inputLines} lines, ${inputBytes} bytes)`,
      hint: "The input is too large. Try reducing capture complexity or increasing limits.",
    });
  }

  // Step 1: Parse JSON (with prototype pollution guard)
  let data: unknown;
  try {
    data = JSON.parse(json, (_key, value) => {
      // Reviver-based prototype pollution guard: strip dangerous keys from all nested objects
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        delete obj["__proto__"];
        delete obj["constructor"];
        delete obj["prototype"];
      }
      return value as unknown;
    });
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
    const supportedVersionsList = [...SUPPORTED_SCHEMA_VERSIONS].map((v) => `"${v}"`).join(", ");
    if (versionIssue && !SUPPORTED_SCHEMA_VERSIONS.has(versionIssue.received.replace(/^"|"$/g, ""))) {
      throw new WebSketchException({
        code: "WS_UNSUPPORTED_VERSION",
        message: `Unsupported capture version: ${versionIssue.received}`,
        expected: supportedVersionsList,
        received: versionIssue.received,
        hint: `This version of websketch-ir supports versions: ${supportedVersionsList}.`,
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
