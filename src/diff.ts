/**
 * WebSketch IR v0.1 - Diff Engine
 *
 * Compares two captures and produces an explainable diff.
 * This is the "truth serum" - if we can't explain changes, we don't have a representation.
 *
 * Design:
 * 1. Match nodes by geometry + role + optional text hash (not just hash equality)
 * 2. Classify changes: added/removed/moved/resized/text-changed/interactive-changed
 * 3. Produce both structured output and human-readable summary
 */

import type { BBox01, UINode, WebSketchCapture } from "./grammar.js";
import {
  bboxSimilarity,
  nodeSimilarity,
  hashNodeShallow,
  fingerprintCapture,
  fingerprintLayout,
} from "./hash.js";

// =============================================================================
// Types
// =============================================================================

export type ChangeType =
  | "added"
  | "removed"
  | "moved"
  | "resized"
  | "text_changed"
  | "interactive_changed"
  | "role_changed"
  | "children_changed";

export interface NodeChange {
  /** Type of change */
  type: ChangeType;
  /** Node from capture A (null if added) */
  nodeA?: UINode;
  /** Node from capture B (null if removed) */
  nodeB?: UINode;
  /** Similarity score if matched (0-1) */
  similarity?: number;
  /** Bbox delta if moved/resized */
  bboxDelta?: {
    dx: number;
    dy: number;
    dw: number;
    dh: number;
  };
  /** Human-readable description */
  description: string;
}

export interface DiffSummary {
  /** Total counts by change type */
  counts: Record<ChangeType, number>;
  /** Are the captures structurally identical? */
  identical: boolean;
  /** Fingerprints match? */
  fingerprintsMatch: boolean;
  /** Layout-only fingerprints match? */
  layoutFingerprintsMatch: boolean;
  /** Node count in A */
  nodeCountA: number;
  /** Node count in B */
  nodeCountB: number;
}

export interface DiffResult {
  /** Summary statistics */
  summary: DiffSummary;
  /** All detected changes */
  changes: NodeChange[];
  /** Top N most significant changes (by area impact) */
  topChanges: NodeChange[];
  /** Capture metadata comparison */
  metadata: {
    urlChanged: boolean;
    viewportChanged: boolean;
    compilerVersionMatch: boolean;
  };
  /** Present when maxDiffNodes triggers truncation */
  truncation?: DiffTruncation;
}

export interface DiffOptions {
  /** Include text hash in matching (default: true) */
  includeText?: boolean;
  /** Include name hash in matching (default: true) */
  includeName?: boolean;
  /** Minimum similarity threshold for matching (default: 0.5) */
  matchThreshold?: number;
  /** Maximum changes to include in topChanges (default: 10) */
  topChangesLimit?: number;
  /** Bbox movement threshold to consider "moved" vs noise (default: 0.01) */
  moveThreshold?: number;
  /** Bbox size threshold to consider "resized" vs noise (default: 0.01) */
  resizeThreshold?: number;
  /** Maximum number of nodes to diff per side before truncating (default: Infinity) */
  maxDiffNodes?: number;
}

export interface DiffTruncation {
  truncated: true;
  nodeCountA: number;
  nodeCountB: number;
  limit: number;
}

const DEFAULT_OPTIONS: Required<DiffOptions> = {
  includeText: true,
  includeName: true,
  matchThreshold: 0.5,
  topChangesLimit: 10,
  moveThreshold: 0.01,
  resizeThreshold: 0.01,
  maxDiffNodes: Infinity,
};

// =============================================================================
// Node Flattening
// =============================================================================

export interface FlatNode {
  node: UINode;
  depth: number;
  path: string;
  hash: string;
}

/**
 * A pre-flattened and pre-fingerprinted capture.
 * Use `prepareDiff()` to create one, then pass it to `diff()` to skip
 * redundant flatten/hash work when diffing the same base against many variants.
 */
export interface PreparedCapture {
  capture: WebSketchCapture;
  flat: FlatNode[];
  fingerprint: string;
}

/**
 * Flatten a node tree into a list with path information.
 */
function flattenTree(node: UINode, depth: number = 0, path: string = ""): FlatNode[] {
  const currentPath = path ? `${path}/${node.role}` : node.role;
  const hash = hashNodeShallow(node);

  const result: FlatNode[] = [{ node, depth, path: currentPath, hash }];

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childPath = `${currentPath}[${i}]`;
      result.push(...flattenTree(child, depth + 1, childPath));
    }
  }

  return result;
}

/**
 * Count total nodes in a tree.
 */
function countNodes(node: UINode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// =============================================================================
// Node Matching
// =============================================================================

interface Match {
  nodeA: FlatNode;
  nodeB: FlatNode;
  similarity: number;
}

/**
 * Bucketed matching for large trees: groups nodes by role first to reduce
 * the comparison space from O(n*m) to O(sum(n_k * m_k)) where k = role.
 */
function findMatchesBucketed(
  nodesA: FlatNode[],
  nodesB: FlatNode[],
  options: Required<DiffOptions>
): { matches: Match[]; unmatchedA: FlatNode[]; unmatchedB: FlatNode[] } {
  // Bucket by role
  const bucketsA = new Map<string, { idx: number; flat: FlatNode }[]>();
  const bucketsB = new Map<string, { idx: number; flat: FlatNode }[]>();

  for (let i = 0; i < nodesA.length; i++) {
    const role = nodesA[i].node.role;
    if (!bucketsA.has(role)) bucketsA.set(role, []);
    bucketsA.get(role)!.push({ idx: i, flat: nodesA[i] });
  }
  for (let j = 0; j < nodesB.length; j++) {
    const role = nodesB[j].node.role;
    if (!bucketsB.has(role)) bucketsB.set(role, []);
    bucketsB.get(role)!.push({ idx: j, flat: nodesB[j] });
  }

  const matches: Match[] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const candidates: { i: number; j: number; sim: number }[] = [];

  // Compare within each role bucket
  for (const [role, aEntries] of bucketsA) {
    const bEntries = bucketsB.get(role);
    if (!bEntries) continue;

    for (const ae of aEntries) {
      for (const be of bEntries) {
        const sim = nodeSimilarity(ae.flat.node, be.flat.node);
        if (sim >= options.matchThreshold) {
          candidates.push({ i: ae.idx, j: be.idx, sim });
        }
      }
    }
  }

  candidates.sort((a, b) => b.sim - a.sim);

  for (const { i, j, sim } of candidates) {
    if (usedA.has(i) || usedB.has(j)) continue;
    matches.push({ nodeA: nodesA[i], nodeB: nodesB[j], similarity: sim });
    usedA.add(i);
    usedB.add(j);
  }

  const unmatchedA = nodesA.filter((_, i) => !usedA.has(i));
  const unmatchedB = nodesB.filter((_, j) => !usedB.has(j));

  return { matches, unmatchedA, unmatchedB };
}

/**
 * Find best matches between two sets of nodes.
 * Uses a greedy algorithm: repeatedly match the highest-similarity pair.
 */
function findMatches(
  nodesA: FlatNode[],
  nodesB: FlatNode[],
  options: Required<DiffOptions>
): { matches: Match[]; unmatchedA: FlatNode[]; unmatchedB: FlatNode[] } {
  // Guard against O(n²) blowup on very large trees.
  // If either side exceeds the threshold, bucket by role to reduce search space.
  const MATCH_THRESHOLD = 2000;
  if (nodesA.length > MATCH_THRESHOLD || nodesB.length > MATCH_THRESHOLD) {
    return findMatchesBucketed(nodesA, nodesB, options);
  }

  const matches: Match[] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // Build similarity matrix (only compute for plausible pairs)
  const candidates: { i: number; j: number; sim: number }[] = [];

  for (let i = 0; i < nodesA.length; i++) {
    for (let j = 0; j < nodesB.length; j++) {
      // Quick filter: same role is a strong signal
      if (nodesA[i].node.role !== nodesB[j].node.role) {
        // Different roles rarely match well
        const bboxSim = bboxSimilarity(nodesA[i].node.bbox, nodesB[j].node.bbox);
        if (bboxSim < 0.3) continue; // Skip if bboxes don't overlap much
      }

      const sim = nodeSimilarity(nodesA[i].node, nodesB[j].node);
      if (sim >= options.matchThreshold) {
        candidates.push({ i, j, sim });
      }
    }
  }

  // Sort by similarity (descending)
  candidates.sort((a, b) => b.sim - a.sim);

  // Greedy matching
  for (const { i, j, sim } of candidates) {
    if (usedA.has(i) || usedB.has(j)) continue;

    matches.push({
      nodeA: nodesA[i],
      nodeB: nodesB[j],
      similarity: sim,
    });
    usedA.add(i);
    usedB.add(j);
  }

  // Collect unmatched
  const unmatchedA = nodesA.filter((_, i) => !usedA.has(i));
  const unmatchedB = nodesB.filter((_, j) => !usedB.has(j));

  return { matches, unmatchedA, unmatchedB };
}

// =============================================================================
// Change Detection
// =============================================================================

/**
 * Compute bbox delta between two nodes.
 */
function computeBboxDelta(a: BBox01, b: BBox01): { dx: number; dy: number; dw: number; dh: number } {
  return {
    dx: b[0] - a[0],
    dy: b[1] - a[1],
    dw: b[2] - a[2],
    dh: b[3] - a[3],
  };
}

/**
 * Classify changes for a matched pair.
 */
function classifyMatchChanges(
  match: Match,
  options: Required<DiffOptions>
): NodeChange[] {
  const changes: NodeChange[] = [];
  const { nodeA, nodeB, similarity } = match;
  const a = nodeA.node;
  const b = nodeB.node;

  const delta = computeBboxDelta(a.bbox, b.bbox);
  const moved = Math.abs(delta.dx) > options.moveThreshold || Math.abs(delta.dy) > options.moveThreshold;
  const resized = Math.abs(delta.dw) > options.resizeThreshold || Math.abs(delta.dh) > options.resizeThreshold;

  // Position change
  if (moved) {
    changes.push({
      type: "moved",
      nodeA: a,
      nodeB: b,
      similarity,
      bboxDelta: delta,
      description: `${a.role}${a.semantic ? `:${a.semantic}` : ""} moved by (${(delta.dx * 100).toFixed(1)}%, ${(delta.dy * 100).toFixed(1)}%)`,
    });
  }

  // Size change
  if (resized) {
    changes.push({
      type: "resized",
      nodeA: a,
      nodeB: b,
      similarity,
      bboxDelta: delta,
      description: `${a.role}${a.semantic ? `:${a.semantic}` : ""} resized by (${(delta.dw * 100).toFixed(1)}%, ${(delta.dh * 100).toFixed(1)}%)`,
    });
  }

  // Role change (rare but important)
  if (a.role !== b.role) {
    changes.push({
      type: "role_changed",
      nodeA: a,
      nodeB: b,
      similarity,
      description: `Role changed from ${a.role} to ${b.role}`,
    });
  }

  // Text change
  if (options.includeText && a.text?.hash !== b.text?.hash) {
    const aLen = a.text?.len ?? 0;
    const bLen = b.text?.len ?? 0;
    changes.push({
      type: "text_changed",
      nodeA: a,
      nodeB: b,
      similarity,
      description: `${a.role}${a.semantic ? `:${a.semantic}` : ""} text changed (${aLen} → ${bLen} chars)`,
    });
  }

  // Interactive change
  if (a.interactive !== b.interactive) {
    changes.push({
      type: "interactive_changed",
      nodeA: a,
      nodeB: b,
      similarity,
      description: `${a.role}${a.semantic ? `:${a.semantic}` : ""} interactive: ${a.interactive} → ${b.interactive}`,
    });
  }

  // Children changed (structural)
  const aChildCount = a.children?.length ?? 0;
  const bChildCount = b.children?.length ?? 0;
  if (aChildCount !== bChildCount) {
    changes.push({
      type: "children_changed",
      nodeA: a,
      nodeB: b,
      similarity,
      description: `${a.role}${a.semantic ? `:${a.semantic}` : ""} children: ${aChildCount} → ${bChildCount}`,
    });
  }

  return changes;
}

/**
 * Compute area of a bbox (for ranking change significance).
 */
function bboxArea(bbox: BBox01): number {
  return bbox[2] * bbox[3];
}

// =============================================================================
// Diff Pre-processing
// =============================================================================

/**
 * Pre-flatten and pre-fingerprint a capture for repeated diffing.
 *
 * When you need to diff the same base capture against many variants,
 * call `prepareDiff(base)` once and pass the result to `diff()` —
 * the flatten + fingerprint work is done only once.
 */
export function prepareDiff(capture: WebSketchCapture): PreparedCapture {
  return {
    capture,
    flat: flattenTree(capture.root),
    fingerprint: fingerprintCapture(capture),
  };
}

/** Type guard: is this a PreparedCapture or a raw WebSketchCapture? */
function isPrepared(input: WebSketchCapture | PreparedCapture): input is PreparedCapture {
  return (
    typeof input === "object" &&
    input !== null &&
    "flat" in input &&
    "fingerprint" in input &&
    "capture" in input
  );
}

// =============================================================================
// Main Diff Function
// =============================================================================

/**
 * Compute diff between two WebSketch captures.
 *
 * Each side accepts either a raw `WebSketchCapture` or a `PreparedCapture`
 * returned by `prepareDiff()`. When a prepared input is provided the
 * flatten/hash step is skipped, saving work for one-to-many comparisons.
 */
export function diff(
  captureA: WebSketchCapture | PreparedCapture,
  captureB: WebSketchCapture | PreparedCapture,
  options: DiffOptions = {}
): DiffResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const rawA = isPrepared(captureA) ? captureA.capture : captureA;
  const rawB = isPrepared(captureB) ? captureB.capture : captureB;

  // Flatten both trees (skip if already prepared)
  let flatA = isPrepared(captureA) ? [...captureA.flat] : flattenTree(rawA.root);
  let flatB = isPrepared(captureB) ? [...captureB.flat] : flattenTree(rawB.root);

  // Check for truncation
  let truncation: DiffTruncation | undefined;
  if (opts.maxDiffNodes !== Infinity &&
      (flatA.length > opts.maxDiffNodes || flatB.length > opts.maxDiffNodes)) {
    truncation = {
      truncated: true,
      nodeCountA: flatA.length,
      nodeCountB: flatB.length,
      limit: opts.maxDiffNodes,
    };
    flatA = flatA.slice(0, opts.maxDiffNodes);
    flatB = flatB.slice(0, opts.maxDiffNodes);
  }

  // Find matches
  const { matches, unmatchedA, unmatchedB } = findMatches(flatA, flatB, opts);

  // Collect all changes
  const changes: NodeChange[] = [];

  // Changes from matched pairs
  for (const match of matches) {
    changes.push(...classifyMatchChanges(match, opts));
  }

  // Added nodes (in B but not matched)
  for (const flat of unmatchedB) {
    changes.push({
      type: "added",
      nodeB: flat.node,
      description: `Added ${flat.node.role}${flat.node.semantic ? `:${flat.node.semantic}` : ""} at (${(flat.node.bbox[0] * 100).toFixed(0)}%, ${(flat.node.bbox[1] * 100).toFixed(0)}%)`,
    });
  }

  // Removed nodes (in A but not matched)
  for (const flat of unmatchedA) {
    changes.push({
      type: "removed",
      nodeA: flat.node,
      description: `Removed ${flat.node.role}${flat.node.semantic ? `:${flat.node.semantic}` : ""} from (${(flat.node.bbox[0] * 100).toFixed(0)}%, ${(flat.node.bbox[1] * 100).toFixed(0)}%)`,
    });
  }

  // Count by type
  const counts: Record<ChangeType, number> = {
    added: 0,
    removed: 0,
    moved: 0,
    resized: 0,
    text_changed: 0,
    interactive_changed: 0,
    role_changed: 0,
    children_changed: 0,
  };
  for (const change of changes) {
    counts[change.type]++;
  }

  // Sort changes by significance (area of affected node)
  const sortedChanges = [...changes].sort((a, b) => {
    const areaA = bboxArea(a.nodeA?.bbox || a.nodeB?.bbox || [0, 0, 0, 0]);
    const areaB = bboxArea(b.nodeA?.bbox || b.nodeB?.bbox || [0, 0, 0, 0]);
    return areaB - areaA;
  });

  const topChanges = sortedChanges.slice(0, opts.topChangesLimit);

  // Summary
  const identical = changes.length === 0;
  const nodeCountA = countNodes(rawA.root);
  const nodeCountB = countNodes(rawB.root);

  // Metadata comparison
  const metadata = {
    urlChanged: rawA.url !== rawB.url,
    viewportChanged:
      rawA.viewport.w_px !== rawB.viewport.w_px ||
      rawA.viewport.h_px !== rawB.viewport.h_px,
    compilerVersionMatch: rawA.compiler.version === rawB.compiler.version,
  };

  // Reuse pre-computed fingerprints when available
  const fpA = isPrepared(captureA) ? captureA.fingerprint : fingerprintCapture(rawA);
  const fpB = isPrepared(captureB) ? captureB.fingerprint : fingerprintCapture(rawB);

  return {
    summary: {
      counts,
      identical,
      fingerprintsMatch: fpA === fpB,
      layoutFingerprintsMatch: fingerprintLayout(rawA) === fingerprintLayout(rawB),
      nodeCountA,
      nodeCountB,
    },
    changes,
    topChanges,
    metadata,
    ...(truncation ? { truncation } : {}),
  };
}

// =============================================================================
// Human-Readable Output
// =============================================================================

/**
 * Format diff result as human-readable text.
 */
export function formatDiff(result: DiffResult): string {
  const lines: string[] = [];

  // Header
  lines.push("WebSketch IR Diff Report");
  lines.push("═".repeat(60));

  // Summary
  lines.push("");
  lines.push("SUMMARY");
  lines.push("─".repeat(40));
  lines.push(`Nodes: ${result.summary.nodeCountA} → ${result.summary.nodeCountB}`);
  lines.push(`Identical: ${result.summary.identical ? "Yes" : "No"}`);
  lines.push("");

  // Counts
  lines.push("CHANGE COUNTS");
  lines.push("─".repeat(40));
  const { counts } = result.summary;
  if (counts.added > 0) lines.push(`  Added:      ${counts.added}`);
  if (counts.removed > 0) lines.push(`  Removed:    ${counts.removed}`);
  if (counts.moved > 0) lines.push(`  Moved:      ${counts.moved}`);
  if (counts.resized > 0) lines.push(`  Resized:    ${counts.resized}`);
  if (counts.text_changed > 0) lines.push(`  Text:       ${counts.text_changed}`);
  if (counts.interactive_changed > 0) lines.push(`  Interactive: ${counts.interactive_changed}`);
  if (counts.role_changed > 0) lines.push(`  Role:       ${counts.role_changed}`);
  if (counts.children_changed > 0) lines.push(`  Children:   ${counts.children_changed}`);

  const totalChanges = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalChanges === 0) {
    lines.push("  (no changes)");
  }

  // Metadata
  lines.push("");
  lines.push("METADATA");
  lines.push("─".repeat(40));
  lines.push(`  URL changed:      ${result.metadata.urlChanged ? "Yes" : "No"}`);
  lines.push(`  Viewport changed: ${result.metadata.viewportChanged ? "Yes" : "No"}`);
  lines.push(`  Compiler match:   ${result.metadata.compilerVersionMatch ? "Yes" : "No"}`);

  // Top changes
  if (result.topChanges.length > 0) {
    lines.push("");
    lines.push("TOP CHANGES (by area)");
    lines.push("─".repeat(40));
    for (const change of result.topChanges) {
      lines.push(`  [${change.type.toUpperCase()}] ${change.description}`);
    }
  }

  lines.push("");
  lines.push("═".repeat(60));

  return lines.join("\n");
}

/**
 * Format diff as JSON (for programmatic use).
 */
export function formatDiffJson(result: DiffResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format a diff result as a concise, human-readable summary optimized
 * for LLM consumption.
 *
 * Produces a one-to-three line summary like:
 * ```
 * "3 nodes added, 2 removed, 1 text changed. Key changes: heading text changed, new BUTTON added at [0.3, 0.5]."
 * ```
 *
 * @param result - The diff result to summarize.
 * @returns A concise change summary string suitable for LLM context.
 */
export function formatDiffForLLM(result: DiffResult): string {
  const { counts, identical } = result.summary;

  if (identical) {
    return "No changes detected.";
  }

  // Build count fragments for non-zero change types
  const fragments: string[] = [];
  if (counts.added > 0) fragments.push(`${counts.added} node${counts.added > 1 ? "s" : ""} added`);
  if (counts.removed > 0) fragments.push(`${counts.removed} removed`);
  if (counts.moved > 0) fragments.push(`${counts.moved} moved`);
  if (counts.resized > 0) fragments.push(`${counts.resized} resized`);
  if (counts.text_changed > 0) fragments.push(`${counts.text_changed} text changed`);
  if (counts.interactive_changed > 0) fragments.push(`${counts.interactive_changed} interactive changed`);
  if (counts.role_changed > 0) fragments.push(`${counts.role_changed} role changed`);
  if (counts.children_changed > 0) fragments.push(`${counts.children_changed} children changed`);

  let summary = fragments.join(", ") + ".";

  // Append key changes from topChanges (up to 5 most significant)
  const keyDescs = result.topChanges.slice(0, 5).map((c) => {
    const node = c.nodeB ?? c.nodeA;
    const role = node?.role ?? "UNKNOWN";
    const bboxStr = node ? `[${node.bbox[0].toFixed(2)}, ${node.bbox[1].toFixed(2)}]` : "";

    switch (c.type) {
      case "added":
        return `new ${role} added at ${bboxStr}`;
      case "removed":
        return `${role} removed from ${bboxStr}`;
      case "text_changed": {
        const label = node?.semantic ? `${role}:${node.semantic}` : role;
        return `${label} text changed`;
      }
      case "moved":
        return `${role} moved`;
      case "resized":
        return `${role} resized`;
      case "role_changed":
        return `role changed from ${c.nodeA?.role ?? "?"} to ${c.nodeB?.role ?? "?"}`;
      default:
        return c.description;
    }
  });

  if (keyDescs.length > 0) {
    summary += " Key changes: " + keyDescs.join(", ") + ".";
  }

  // Note truncation if applicable
  if (result.truncation) {
    summary += ` (truncated at ${result.truncation.limit} nodes)`;
  }

  return summary;
}
