/**
 * WebSketch IR v0.1 - Text Processing
 *
 * Handles text normalization and hashing for invariant comparison.
 * Goal: same semantic content = same hash, regardless of whitespace/case.
 */

import type { TextKind, TextSignal } from "./grammar.js";
import { WebSketchException } from "./errors.js";

// =============================================================================
// Text Normalization
// =============================================================================

/**
 * Zero-width and invisible characters to strip.
 */
const INVISIBLE_CHARS =
  /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E\u202A-\u202E\u2066-\u2069]/g;

/** LRU cache for normalizeText results. Map preserves insertion order. */
const NORMALIZE_CACHE = new Map<string, string>();
const NORMALIZE_CACHE_MAX = 1000;

/**
 * Normalize text for hashing.
 * - Trim leading/trailing whitespace
 * - Collapse internal whitespace to single space
 * - Lowercase
 * - Strip zero-width/invisible characters
 *
 * Results are LRU-cached (up to 1 000 entries) so repeated calls
 * with the same raw text skip the regex work.
 */
export function normalizeText(text: string): string {
  if (typeof text !== "string") return "";

  const cached = NORMALIZE_CACHE.get(text);
  if (cached !== undefined) {
    // Move to end (most-recently-used) by re-inserting
    NORMALIZE_CACHE.delete(text);
    NORMALIZE_CACHE.set(text, cached);
    return cached;
  }

  const result = text
    .replace(INVISIBLE_CHARS, "") // Remove invisible chars
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim() // Trim edges
    .toLowerCase(); // Case-insensitive

  // Evict oldest entry when at capacity
  if (NORMALIZE_CACHE.size >= NORMALIZE_CACHE_MAX) {
    const oldest = NORMALIZE_CACHE.keys().next().value!;
    NORMALIZE_CACHE.delete(oldest);
  }
  NORMALIZE_CACHE.set(text, result);

  return result;
}

// =============================================================================
// Text Hashing (SHA-256)
// =============================================================================

/**
 * Compute SHA-256 hash of a string.
 * Works in both browser (SubtleCrypto) and Node.js (crypto).
 */
export async function sha256(text: string): Promise<string> {
  // Browser environment
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Node.js environment
  if (typeof process !== "undefined" && process.versions?.node) {
    const { createHash } = await import("crypto");
    return createHash("sha256").update(text).digest("hex");
  }

  throw new WebSketchException({
    code: "WS_INTERNAL",
    message: "No crypto implementation available",
    hint: "SHA-256 requires SubtleCrypto (browser) or node:crypto (Node); use hashSync/createTextSignalSync for a dependency-free FNV-1a hash",
  });
}

/**
 * FNV-1a 64-bit hash constants.
 * Using BigInt for proper 64-bit arithmetic.
 */
const FNV1A_64_OFFSET = 0xcbf29ce484222325n;
const FNV1A_64_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

/**
 * FNV-1a 64-bit hash function.
 * Fast, deterministic, excellent distribution, but NOT cryptographic.
 * Used for structural fingerprinting where security isn't a concern.
 * 64-bit output dramatically reduces collision probability vs 32-bit djb2.
 *
 * **Note:** This implementation operates on UTF-16 code units (via `charCodeAt`),
 * not Unicode code points. Surrogate pairs (characters outside the BMP, U+10000+)
 * are hashed as two separate 16-bit values. This means hash values are
 * JavaScript-runtime-specific and should not be compared across runtimes that
 * use different string encodings (e.g., UTF-8 byte-level hashing).
 */
function fnv1a64(text: string): string {
  let hash = FNV1A_64_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * FNV1A_64_PRIME) & MASK_64;
  }
  return hash.toString(16).padStart(16, "0");
}

/**
 * Synchronous hash for structural fingerprinting.
 * Uses FNV-1a 64-bit for speed and low collision probability.
 * Returns a 16-character hexadecimal string.
 */
export function hashSync(text: string): string {
  return fnv1a64(text);
}

/**
 * @deprecated Use {@link hashSync} instead. This function uses FNV-1a, not SHA-256.
 * Kept as an alias for backward compatibility — will be removed in a future major version.
 */
export const sha256Sync: (text: string) => string = hashSync;

// =============================================================================
// Text Classification
// =============================================================================

/** Thresholds for text classification */
const TEXT_THRESHOLDS = {
  /** Max length for "short" (single word, label, etc.) */
  SHORT: 20,
  /** Max length for "sentence" */
  SENTENCE: 150,
} as const;

/**
 * Classify text by length/shape.
 * Anything longer than SENTENCE is classified as "paragraph" (no upper bound).
 */
export function classifyText(normalizedText: string): TextKind {
  const len = normalizedText.length;

  if (len === 0) return "none";
  if (len <= TEXT_THRESHOLDS.SHORT) return "short";
  if (len <= TEXT_THRESHOLDS.SENTENCE) return "sentence";
  return "paragraph";
}

/**
 * Check if text contains mixed content (e.g., multiple paragraphs).
 *
 * Note (intentional asymmetry): this inspects the *raw* text, while
 * {@link createTextSignal}'s `hash`/`len` reflect *normalized* text. This is
 * deliberate — `kind` reflects the raw visual layout (blank-line structure),
 * whereas `hash`/`len` reflect normalized content (whitespace collapsed).
 */
export function isMixedContent(rawText: string): boolean {
  // Multiple line breaks suggest mixed content
  const lineBreaks = (rawText.match(/\n\s*\n/g) || []).length;
  return lineBreaks >= 2;
}

// =============================================================================
// Text Signal Generation
// =============================================================================

/**
 * Generate a TextSignal from raw text.
 * This is the main entry point for text processing.
 *
 * The hash is computed with {@link hashSync} (FNV-1a 64-bit, 16 hex chars) —
 * the canonical structural hash used everywhere else in the library (e.g.
 * `hashNodeShallow` slices `text_hash` to 16 chars expecting FNV). This MUST
 * match {@link createTextSignalSync} so async and sync capture paths never
 * mis-diff against each other. The async signature is retained for API
 * back-compat even though no async work is performed.
 *
 * Note: `TextSignal.len` counts UTF-16 code units (consistent with the
 * {@link fnv1a64} UTF-16 caveat), not Unicode code points.
 */
export function createTextSignal(rawText: string): Promise<TextSignal> {
  // Delegates to the sync builder so both paths produce byte-identical
  // TextSignal.hash values. The Promise-returning signature is retained for
  // API back-compat; no async work is performed.
  return Promise.resolve(createTextSignalSync(rawText));
}

/**
 * Synchronous version of createTextSignal.
 * Uses sync hash (node-only for crypto, simple hash in browser).
 *
 * Note: `TextSignal.len` counts UTF-16 code units (consistent with the
 * {@link fnv1a64} UTF-16 caveat), not Unicode code points.
 */
export function createTextSignalSync(rawText: string): TextSignal {
  const normalized = normalizeText(rawText);
  const len = normalized.length;

  if (len === 0) {
    return { kind: "none" };
  }

  const kind = isMixedContent(rawText) ? "mixed" : classifyText(normalized);
  const hash = hashSync(normalized);

  return {
    hash,
    len,
    kind,
  };
}

// =============================================================================
// Utility: Extract visible text from element
// =============================================================================

/**
 * Check if text is "meaningful" (not just whitespace/symbols).
 */
export function isMeaningfulText(text: string): boolean {
  const normalized = normalizeText(text);
  // Must have at least one alphanumeric character
  return normalized.length > 0 && /[a-z0-9]/.test(normalized);
}
