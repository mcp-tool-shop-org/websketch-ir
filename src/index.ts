/**
 * WebSketch IR v0.1 - Core Package
 *
 * A grammar-based representation of web UI for LLM consumption.
 * "Stop treating webpages like pictures."
 */

// Grammar types
export type {
  BBox01,
  ViewportMeta,
  TextKind,
  TextSignal,
  UIRole,
  UINodeFlags,
  UINode,
  CompilerMeta,
  WebSketchCapture,
} from "./grammar.js";

export {
  MAX_DEPTH,
  MAX_CHILDREN,
  BBOX_QUANT_STEP,
  COLLAPSE_TOLERANCE,
} from "./grammar.js";

// Text processing
export {
  normalizeText,
  sha256,
  hashSync,
  /** @deprecated Use hashSync instead — sha256Sync uses djb2, not SHA-256. */
  sha256Sync,
  classifyText,
  isMixedContent,
  createTextSignal,
  createTextSignalSync,
  isMeaningfulText,
} from "./text.js";

// Hashing
export type { HashOptions } from "./hash.js";
export {
  quantizeBbox,
  bboxToString,
  hashNodeShallow,
  hashNodeDeep,
  fingerprintCapture,
  fingerprintLayout,
  generateNodeId,
  assignNodeIds,
  nodeSimilarity,
  bboxSimilarity,
} from "./hash.js";

// ASCII rendering
export type { AsciiRenderOptions } from "./render/ascii.js";
export {
  renderAscii,
  renderNodeAscii,
  renderStructure,
  renderForLLM,
  generateLegend,
} from "./render/ascii.js";

// Diff
export type {
  ChangeType,
  NodeChange,
  DiffSummary,
  DiffResult,
  DiffOptions,
} from "./diff.js";
export {
  diff,
  formatDiff,
  formatDiffJson,
} from "./diff.js";

// Schema version compatibility
export {
  CURRENT_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  isSupportedSchemaVersion,
} from "./compat.js";

// Error types and validation
export type {
  WebSketchErrorCode,
  WebSketchError,
  WebSketchValidationIssue,
  WebSketchValidationError,
  WebSketchLimits,
} from "./errors.js";
export {
  WebSketchException,
  DEFAULT_LIMITS,
  validateCapture,
  parseCapture,
  formatWebSketchError,
  isWebSketchException,
} from "./errors.js";
