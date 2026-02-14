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
}

const DEFAULT_OPTIONS: Required<DiffOptions> = {
  includeText: true,
  includeName: true,
  matchThreshold: 0.5,
  topChangesLimit: 10,
  moveThreshold: 0.01,
  resizeThreshold: 0.01,
};

// =============================================================================
// Node Flattening
// =============================================================================

interface FlatNode {
  node: UINode;
  depth: number;
  path: string;
  hash: string;
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
 * Find best matches between two sets of nodes.
 * Uses a greedy algorithm: repeatedly match the highest-similarity pair.
 */
function findMatches(
  nodesA: FlatNode[],
  nodesB: FlatNode[],
  options: Required<DiffOptions>
): { matches: Match[]; unmatchedA: FlatNode[]; unmatchedB: FlatNode[] } {
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
    const aLen = a.text?.len || 0;
    const bLen = b.text?.len || 0;
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
  const aChildCount = a.children?.length || 0;
  const bChildCount = b.children?.length || 0;
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
// Main Diff Function
// =============================================================================

/**
 * Compute diff between two WebSketch captures.
 */
export function diff(
  captureA: WebSketchCapture,
  captureB: WebSketchCapture,
  options: DiffOptions = {}
): DiffResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Flatten both trees
  const flatA = flattenTree(captureA.root);
  const flatB = flattenTree(captureB.root);

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
  const nodeCountA = countNodes(captureA.root);
  const nodeCountB = countNodes(captureB.root);

  // Metadata comparison
  const metadata = {
    urlChanged: captureA.url !== captureB.url,
    viewportChanged:
      captureA.viewport.w_px !== captureB.viewport.w_px ||
      captureA.viewport.h_px !== captureB.viewport.h_px,
    compilerVersionMatch: captureA.compiler.version === captureB.compiler.version,
  };

  return {
    summary: {
      counts,
      identical,
      fingerprintsMatch: fingerprintCapture(captureA) === fingerprintCapture(captureB),
      layoutFingerprintsMatch: fingerprintLayout(captureA) === fingerprintLayout(captureB),
      nodeCountA,
      nodeCountB,
    },
    changes,
    topChanges,
    metadata,
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
