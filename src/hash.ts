/**
 * WebSketch IR v0.1 - Node Hashing
 *
 * Structural fingerprinting for nodes and captures.
 * Used for:
 * - Fast equality checks
 * - Content-addressed node IDs
 * - Diff matching
 *
 * **Algorithm versioning note:** The current implementation uses the
 * hash function from `text.ts` (FNV-1a 64-bit). Changing the algorithm
 * would invalidate every existing fingerprint and content-addressed ID.
 * If a migration is ever needed, prefix hashes with a version tag
 * (e.g. `v1:abc123`) so consumers can detect and handle mixed corpora.
 */

import type { BBox01, UINode, WebSketchCapture } from "./grammar.js";
import { BBOX_QUANT_STEP } from "./grammar.js";
import { hashSync } from "./text.js";

// =============================================================================
// Bbox Quantization
// =============================================================================

/**
 * Quantize a bbox value to reduce noise from subpixel differences.
 * Default step: 0.001 (1px at 1000px viewport)
 */
export function quantizeBbox(bbox: BBox01, step: number = BBOX_QUANT_STEP): BBox01 {
  return [
    Math.round(bbox[0] / step) * step,
    Math.round(bbox[1] / step) * step,
    Math.round(bbox[2] / step) * step,
    Math.round(bbox[3] / step) * step,
  ] as BBox01;
}

/**
 * Convert bbox to string for hashing.
 */
export function bboxToString(bbox: BBox01, precision: number = 3): string {
  return bbox.map((v) => v.toFixed(precision)).join(",");
}

// =============================================================================
// Node Hashing
// =============================================================================

/**
 * Hash input for a single node (excluding children).
 */
interface NodeHashInput {
  role: string;
  bbox: string;
  interactive: boolean;
  visible: boolean;
  enabled?: boolean;
  semantic?: string;
  text_hash?: string;
  name_hash?: string;
  z?: number;
}

/**
 * Create hash input from a node (shallow, no children).
 */
function nodeToHashInput(node: UINode): NodeHashInput {
  const qbbox = quantizeBbox(node.bbox);
  return {
    role: node.role,
    bbox: bboxToString(qbbox),
    interactive: node.interactive,
    visible: node.visible,
    enabled: node.enabled,
    semantic: node.semantic,
    text_hash: node.text?.hash,
    name_hash: node.name_hash,
    z: node.z,
  };
}

/**
 * Options for node hashing.
 */
export interface HashOptions {
  /** Include text_hash in structural hash (default: true) */
  includeText?: boolean;
  /** Include name_hash in structural hash (default: true) */
  includeName?: boolean;
  /** Include z-index in hash (default: false, since it's often noisy) */
  includeZ?: boolean;
  /** Include handler intents in hash (default: true) */
  includeHandlers?: boolean;
  /** Include binding signals in hash (default: false) */
  includeBindings?: boolean;
  /** Include state signals in hash (default: true) */
  includeState?: boolean;
  /** Include style intent tokens in hash (default: false — visual noise) */
  includeStyle?: boolean;
  /** Include pattern signals in hash (default: true) */
  includePattern?: boolean;
}

const DEFAULT_HASH_OPTIONS: HashOptions = {
  includeText: true,
  includeName: true,
  includeZ: false,
  includeHandlers: true,
  includeBindings: false,
  includeState: true,
  includeStyle: false,
  includePattern: true,
};

/**
 * Compute structural hash for a node (without children).
 */
export function hashNodeShallow(node: UINode, options: HashOptions = {}): string {
  const opts = { ...DEFAULT_HASH_OPTIONS, ...options };
  const input = nodeToHashInput(node);

  // Build deterministic string representation
  const parts: string[] = [
    `r:${input.role}`,
    `b:${input.bbox}`,
    `i:${input.interactive ? 1 : 0}`,
    `v:${input.visible ? 1 : 0}`,
  ];

  if (input.enabled !== undefined) {
    parts.push(`e:${input.enabled ? 1 : 0}`);
  }

  if (input.semantic) {
    parts.push(`s:${input.semantic}`);
  }

  if (opts.includeText && input.text_hash) {
    parts.push(`t:${input.text_hash.slice(0, 16)}`); // Truncate for efficiency
  }

  if (opts.includeName && input.name_hash) {
    parts.push(`n:${input.name_hash.slice(0, 16)}`);
  }

  if (opts.includeZ && input.z !== undefined) {
    parts.push(`z:${input.z}`);
  }

  // Handler intents (sorted for determinism)
  if (opts.includeHandlers && node.handlers && node.handlers.length > 0) {
    const hParts = [...node.handlers]
      .sort((a, b) => a.event.localeCompare(b.event) || a.intent.localeCompare(b.intent))
      .map((h) => `${h.event}:${h.intent}${h.target ? `→${h.target}` : ""}`);
    parts.push(`h:[${hParts.join(",")}]`);
  }

  // Binding signals (sorted for determinism)
  if (opts.includeBindings && node.bindings && node.bindings.length > 0) {
    const bParts = [...node.bindings]
      .sort((a, b) => a.property.localeCompare(b.property))
      .map((b) => `${b.property}=${b.expression}`);
    parts.push(`bd:[${bParts.join(",")}]`);
  }

  // State signals (sorted for determinism)
  if (opts.includeState && node.state && node.state.length > 0) {
    const sParts = [...node.state]
      .sort((a, b) => a.key.localeCompare(b.key) || a.access.localeCompare(b.access))
      .map((s) => `${s.key}:${s.access}${s.scope ? `@${s.scope}` : ""}`);
    parts.push(`st:[${sParts.join(",")}]`);
  }

  // Style intent tokens (sorted for determinism)
  if (opts.includeStyle && node.style?.tokens && node.style.tokens.length > 0) {
    const tParts = [...node.style.tokens].sort();
    const extras: string[] = [];
    if (node.style.density) extras.push(`d:${node.style.density}`);
    if (node.style.size) extras.push(`sz:${node.style.size}`);
    const suffix = extras.length > 0 ? `|${extras.join(",")}` : "";
    parts.push(`si:[${tParts.join(",")}${suffix}]`);
  }

  // Pattern signal (kind + optional name/variant/slot)
  if (opts.includePattern && node.pattern) {
    const pParts = [`k:${node.pattern.kind}`];
    if (node.pattern.name) pParts.push(`n:${node.pattern.name}`);
    if (node.pattern.variant) pParts.push(`v:${node.pattern.variant}`);
    if (node.pattern.slot) pParts.push(`sl:${node.pattern.slot}`);
    parts.push(`pt:[${pParts.join(",")}]`);
  }

  return hashSync(parts.join("\0"));
}

/**
 * Maximum recursion depth for {@link hashNodeDeep}. A defensive ceiling that
 * matches the validator's spirit: well-formed UI trees are nowhere near this
 * deep, so a tree exceeding it indicates a cycle or pathological input. Hitting
 * the cap stops recursion (the over-deep subtree contributes only its shallow
 * hash) rather than overflowing the stack.
 */
const MAX_HASH_DEPTH = 1000;

/**
 * Compute structural hash for a node including children (recursive).
 * Children are sorted by position (y, then x) for stability.
 *
 * The child comparator is total and NaN-safe: non-finite coordinates coerce to
 * `Infinity` so they sort last deterministically rather than yielding
 * implementation-defined order, and ties (equal or non-finite positions) fall
 * back to comparing each child's shallow hash so the order stays reproducible
 * regardless of the input child order.
 *
 * @param depth - internal recursion depth (callers should omit). Recursion is
 *   capped at {@link MAX_HASH_DEPTH} as a defense against cyclic or
 *   pathologically deep inputs; callers should still validate tree depth.
 */
export function hashNodeDeep(
  node: UINode,
  options: HashOptions = {},
  depth: number = 0,
): string {
  const shallowHash = hashNodeShallow(node, options);

  if (depth >= MAX_HASH_DEPTH || !node.children || node.children.length === 0) {
    return shallowHash;
  }

  // Coerce a coordinate to a finite, comparable value: non-finite (NaN/Infinity)
  // sorts last deterministically instead of producing implementation-defined order.
  const coord = (c: number): number => (Number.isFinite(c) ? c : Infinity);

  // Sort children by position for deterministic ordering
  const sortedChildren = [...node.children].sort((a, b) => {
    // Primary sort: y position (NaN-safe)
    const yDiff = coord(a.bbox[1]) - coord(b.bbox[1]);
    if (Number.isFinite(yDiff) && Math.abs(yDiff) > BBOX_QUANT_STEP) return yDiff;
    // Secondary sort: x position (NaN-safe)
    const xDiff = coord(a.bbox[0]) - coord(b.bbox[0]);
    if (Number.isFinite(xDiff) && xDiff !== 0) return xDiff;
    // Final tiebreaker: shallow hash, so equal/non-finite positions still order
    // reproducibly regardless of input child order.
    return hashNodeShallow(a, options).localeCompare(hashNodeShallow(b, options));
  });

  // Hash children recursively
  const childHashes = sortedChildren.map((child) => hashNodeDeep(child, options, depth + 1));

  // Combine shallow hash with child hashes
  const combined = `${shallowHash}|c:[${childHashes.join(",")}]`;
  return hashSync(combined);
}

// =============================================================================
// Capture Fingerprinting
// =============================================================================

/**
 * Compute a fingerprint for an entire capture.
 * This is a fast check for "is this page the same?"
 *
 * @param options - hashing options threaded through to {@link hashNodeDeep}.
 *   Omitted (or omitted keys) fall back to {@link DEFAULT_HASH_OPTIONS}, so a
 *   no-arg call produces the same fingerprint as before this option existed.
 */
export function fingerprintCapture(
  capture: WebSketchCapture,
  options: HashOptions = {},
): string {
  const rootHash = hashNodeDeep(capture.root, options);

  // Include viewport aspect ratio (different layouts = different fingerprint).
  // Normalize non-finite aspect to 0 so the fingerprint never contains "NaN"/"Infinity".
  const aspect = Number.isFinite(capture.viewport.aspect) ? capture.viewport.aspect : 0;
  const aspectKey = aspect.toFixed(2);

  return hashSync(`${rootHash}|a:${aspectKey}`);
}

/**
 * Compute a layout-only fingerprint (ignores text content).
 * Useful for detecting structural changes while ignoring content updates.
 *
 * @param options - hashing options threaded through to {@link hashNodeDeep}.
 *   The layout override `{ includeText: false, includeName: false }` always
 *   wins on those two keys — a layout fingerprint stays text- and name-agnostic
 *   regardless of caller input — while the caller controls every other key.
 *   A no-arg call produces the same fingerprint as before this option existed.
 */
export function fingerprintLayout(
  capture: WebSketchCapture,
  options: HashOptions = {},
): string {
  // Caller options first, then the layout override wins on text/name.
  const layoutOptions: HashOptions = {
    ...options,
    includeText: false,
    includeName: false,
  };
  const rootHash = hashNodeDeep(capture.root, layoutOptions);

  // Normalize non-finite aspect to 0 so the fingerprint never contains "NaN"/"Infinity".
  const aspect = Number.isFinite(capture.viewport.aspect) ? capture.viewport.aspect : 0;
  const aspectKey = aspect.toFixed(2);
  return hashSync(`${rootHash}|a:${aspectKey}`);
}

// =============================================================================
// Node ID Generation
// =============================================================================

/**
 * Generate a stable ID for a node based on its content and position.
 * This is content-addressed: same node = same ID across captures.
 */
export function generateNodeId(node: UINode, parentPath: string = ""): string {
  const hash = hashNodeShallow(node);
  // Use first 12 chars of hash + position hint. Sanitize non-finite coordinates
  // to 0 so generated ids never contain "NaN".
  const px = Number.isFinite(node.bbox[0]) ? Math.round(node.bbox[0] * 100) : 0;
  const py = Number.isFinite(node.bbox[1]) ? Math.round(node.bbox[1] * 100) : 0;
  const posHint = `${px}_${py}`;
  return parentPath ? `${parentPath}/${hash.slice(0, 12)}_${posHint}` : `/${hash.slice(0, 12)}_${posHint}`;
}

/**
 * Assign IDs to all nodes in a tree (mutates in place).
 */
export function assignNodeIds(node: UINode, parentPath: string = ""): void {
  node.id = generateNodeId(node, parentPath);

  if (node.children) {
    for (const child of node.children) {
      assignNodeIds(child, node.id);
    }
  }
}

// =============================================================================
// Similarity / Matching
// =============================================================================

/**
 * Compute similarity score between two nodes (0-1).
 * Used for diff matching.
 *
 * Note: The denominator (weights) varies per pair because optional
 * features (semantics, handlers, state, style, pattern) only contribute
 * when present. Scores are therefore relative — valid for ranking
 * candidate matches but not directly comparable across unrelated pairs.
 */
export function nodeSimilarity(a: UINode, b: UINode): number {
  let score = 0;
  let weights = 0;

  // Role match (high weight)
  if (a.role === b.role) {
    score += 3;
  }
  weights += 3;

  // Bbox proximity (using IoU-like metric)
  const bboxSim = bboxSimilarity(a.bbox, b.bbox);
  score += bboxSim * 2;
  weights += 2;

  // Interactivity match
  if (a.interactive === b.interactive) {
    score += 1;
  }
  weights += 1;

  // Semantic match (if present)
  if (a.semantic && b.semantic) {
    weights += 2;
    if (a.semantic === b.semantic) {
      score += 2;
    }
    // Explicit mismatch: both have semantics but they differ — no score added
  } else if (a.semantic || b.semantic) {
    weights += 2; // Penalize if one has semantic and other doesn't
  }

  // Text hash match
  if (a.text?.hash && b.text?.hash && a.text.hash === b.text.hash) {
    score += 1;
  }
  weights += 1;

  // Handler event match (same set of event types → likely same component)
  const aEvents = a.handlers?.map((h) => h.event).sort().join(",") ?? "";
  const bEvents = b.handlers?.map((h) => h.event).sort().join(",") ?? "";
  if (aEvents && bEvents && aEvents === bEvents) {
    score += 1;
  }
  if (aEvents || bEvents) {
    weights += 1;
  }

  // State key overlap (shared state keys → likely related components)
  const aStateKeys = new Set(a.state?.map((s) => s.key) ?? []);
  const bStateKeys = new Set(b.state?.map((s) => s.key) ?? []);
  if (aStateKeys.size > 0 && bStateKeys.size > 0) {
    let overlap = 0;
    for (const k of aStateKeys) {
      if (bStateKeys.has(k)) overlap++;
    }
    const union = new Set([...aStateKeys, ...bStateKeys]).size;
    score += union > 0 ? overlap / union : 0;
    weights += 1;
  }

  // Style intent token overlap
  const aTokens = new Set(a.style?.tokens ?? []);
  const bTokens = new Set(b.style?.tokens ?? []);
  if (aTokens.size > 0 && bTokens.size > 0) {
    let overlap = 0;
    for (const t of aTokens) {
      if (bTokens.has(t)) overlap++;
    }
    const union = new Set([...aTokens, ...bTokens]).size;
    score += union > 0 ? overlap / union : 0;
    weights += 1;
  }

  // Pattern kind match (same pattern kind → very likely same component)
  if (a.pattern && b.pattern) {
    if (a.pattern.kind === b.pattern.kind) {
      score += 2;
      // Bonus for matching name within same kind
      if (a.pattern.name && b.pattern.name && a.pattern.name === b.pattern.name) {
        score += 1;
      }
    }
    weights += 3;
  } else if (a.pattern || b.pattern) {
    // One has a pattern, the other doesn't — slight penalty
    weights += 2;
  }

  return score / weights;
}

/**
 * Compute bbox similarity (0-1) using IoU-like metric.
 *
 * Degenerate inputs: a non-finite (NaN/Infinity) coordinate makes the union
 * non-finite and yields 0 rather than NaN; two identical zero-area boxes at the
 * same point return 1 (perfect match).
 */
export function bboxSimilarity(a: BBox01, b: BBox01): number {
  // Intersection
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

  // Union
  const areaA = a[2] * a[3];
  const areaB = b[2] * b[3];
  const union = areaA + areaB - intersection;

  if (!Number.isFinite(union) || union <= 0) {
    // Two identical zero-area boxes at the same point (collapsed/measure-only
    // elements, common in real DOMs) are geometrically identical — treat as a
    // perfect match rather than penalizing them with 0. A non-finite union
    // (from a NaN/Infinity coordinate) falls through to 0, not NaN.
    if (a[0] === b[0] && a[1] === b[1]) return 1;
    return 0;
  }
  return intersection / union;
}
