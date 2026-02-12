/**
 * WebSketch IR v0.1 - Node Hashing
 *
 * Structural fingerprinting for nodes and captures.
 * Used for:
 * - Fast equality checks
 * - Content-addressed node IDs
 * - Diff matching
 */

import type { BBox01, UINode, WebSketchCapture } from "./grammar.js";
import { BBOX_QUANT_STEP } from "./grammar.js";
import { sha256Sync } from "./text.js";

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
  ] as const;
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
}

const DEFAULT_HASH_OPTIONS: HashOptions = {
  includeText: true,
  includeName: true,
  includeZ: false,
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

  return sha256Sync(parts.join("|"));
}

/**
 * Compute structural hash for a node including children (recursive).
 * Children are sorted by position (y, then x) for stability.
 */
export function hashNodeDeep(node: UINode, options: HashOptions = {}): string {
  const shallowHash = hashNodeShallow(node, options);

  if (!node.children || node.children.length === 0) {
    return shallowHash;
  }

  // Sort children by position for deterministic ordering
  const sortedChildren = [...node.children].sort((a, b) => {
    // Primary sort: y position
    const yDiff = a.bbox[1] - b.bbox[1];
    if (Math.abs(yDiff) > BBOX_QUANT_STEP) return yDiff;
    // Secondary sort: x position
    return a.bbox[0] - b.bbox[0];
  });

  // Hash children recursively
  const childHashes = sortedChildren.map((child) => hashNodeDeep(child, options));

  // Combine shallow hash with child hashes
  const combined = `${shallowHash}|c:[${childHashes.join(",")}]`;
  return sha256Sync(combined);
}

// =============================================================================
// Capture Fingerprinting
// =============================================================================

/**
 * Compute a fingerprint for an entire capture.
 * This is a fast check for "is this page the same?"
 */
export function fingerprintCapture(capture: WebSketchCapture): string {
  const rootHash = hashNodeDeep(capture.root);

  // Include viewport aspect ratio (different layouts = different fingerprint)
  const aspectKey = capture.viewport.aspect.toFixed(2);

  return sha256Sync(`${rootHash}|a:${aspectKey}`);
}

/**
 * Compute a layout-only fingerprint (ignores text content).
 * Useful for detecting structural changes while ignoring content updates.
 */
export function fingerprintLayout(capture: WebSketchCapture): string {
  const rootHash = hashNodeDeep(capture.root, {
    includeText: false,
    includeName: false,
  });

  const aspectKey = capture.viewport.aspect.toFixed(2);
  return sha256Sync(`${rootHash}|a:${aspectKey}`);
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
  // Use first 12 chars of hash + position hint
  const posHint = `${Math.round(node.bbox[0] * 100)}_${Math.round(node.bbox[1] * 100)}`;
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
  if (a.semantic && b.semantic && a.semantic === b.semantic) {
    score += 2;
  } else if (a.semantic || b.semantic) {
    weights += 2; // Penalize if one has semantic and other doesn't match
  }

  // Text hash match
  if (a.text?.hash && b.text?.hash && a.text.hash === b.text.hash) {
    score += 1;
  }
  weights += 1;

  return score / weights;
}

/**
 * Compute bbox similarity (0-1) using IoU-like metric.
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

  if (union === 0) return 0;
  return intersection / union;
}
