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
  EventType,
  HandlerSignal,
  BindingSignal,
  StateAccessKind,
  StateSignal,
  StyleIntentToken,
  StyleIntent,
  PatternKind,
  PatternSignal,
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
  VALID_EVENT_TYPES,
  VALID_STATE_ACCESS_KINDS,
  VALID_STATE_SCOPES,
  VALID_STYLE_INTENT_TOKENS,
  VALID_DENSITIES,
  VALID_SIZES,
  VALID_PATTERN_KINDS,
  ROLES,
  // Tree traversal
  flattenNodes,
  walkNodes,
  filterNodes,
  // Query / selector
  queryByRole,
  queryByPredicate,
  findFirst,
  findByRole,
  // Builder / factory
  createNode,
  createCapture,
  // Addressability / relationships
  findById,
  getPath,
  getParent,
  findAncestor,
  queryWithin,
  // Library version
  LIBRARY_VERSION,
} from "./grammar.js";

// Text processing
export {
  normalizeText,
  sha256,
  hashSync,
  /** @deprecated Use hashSync instead — sha256Sync actually uses FNV-1a, not SHA-256. */
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
export type { AsciiRenderOptions, RenderForLLMOptions } from "./render/ascii.js";
export {
  renderAscii,
  renderNodeAscii,
  renderStructure,
  renderForLLM,
  generateLegend,
} from "./render/ascii.js";

// JSON rendering (LLM tool-calling)
export type { RenderJSONOptions, JSONNode, RenderJSONFlatEntry } from "./render/json.js";
export { renderJSON, renderJSONFlat } from "./render/json.js";

// Diff
export type {
  ChangeType,
  NodeChange,
  DiffSummary,
  DiffResult,
  DiffOptions,
  DiffTruncation,
  FlatNode,
  PreparedCapture,
} from "./diff.js";
export {
  diff,
  prepareDiff,
  formatDiff,
  formatDiffJson,
  formatDiffForLLM,
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
  isValidCapture,
  assertValidCapture,
  parseCapture,
  formatWebSketchError,
  isWebSketchException,
  getWebSketchError,
} from "./errors.js";

// Code generation
export type { EmitHTMLOptions } from "./codegen/index.js";
export { emitHTML, emitNodeHTML, roleToElement } from "./codegen/index.js";
