/**
 * WebSketch IR v0.1 - Text Processing
 *
 * Handles text normalization and hashing for invariant comparison.
 * Goal: same semantic content = same hash, regardless of whitespace/case.
 */

import type { TextKind, TextSignal } from "./grammar.js";

// =============================================================================
// Text Normalization
// =============================================================================

/**
 * Zero-width and invisible characters to strip.
 */
const INVISIBLE_CHARS =
  /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E\u202A-\u202E\u2066-\u2069]/g;

/**
 * Normalize text for hashing.
 * - Trim leading/trailing whitespace
 * - Collapse internal whitespace to single space
 * - Lowercase
 * - Strip zero-width/invisible characters
 */
export function normalizeText(text: string): string {
  return text
    .replace(INVISIBLE_CHARS, "") // Remove invisible chars
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim() // Trim edges
    .toLowerCase(); // Case-insensitive
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

  throw new Error("No crypto implementation available");
}

/**
 * Simple djb2 hash function.
 * Fast, deterministic, but NOT cryptographic.
 * Used for structural fingerprinting where security isn't a concern.
 */
function djb2Hash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  // Convert to hex, ensure consistent length
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Synchronous hash for structural fingerprinting.
 * Uses djb2 for speed - this is NOT for security, just for comparing structures.
 */
export function sha256Sync(text: string): string {
  // For structural hashing, djb2 is sufficient and works everywhere
  // If you need cryptographic hashing, use the async sha256() function
  return djb2Hash(text);
}

// =============================================================================
// Text Classification
// =============================================================================

/** Thresholds for text classification */
const TEXT_THRESHOLDS = {
  /** Max length for "short" (single word, label, etc.) */
  SHORT: 20,
  /** Max length for "sentence" */
  SENTENCE: 150,
  /** Beyond this is "paragraph" */
  PARAGRAPH: 150,
} as const;

/**
 * Classify text by length/shape.
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
 */
export async function createTextSignal(rawText: string): Promise<TextSignal> {
  const normalized = normalizeText(rawText);
  const len = normalized.length;

  if (len === 0) {
    return { kind: "none" };
  }

  const kind = isMixedContent(rawText) ? "mixed" : classifyText(normalized);
  const hash = await sha256(normalized);

  return {
    hash,
    len,
    kind,
  };
}

/**
 * Synchronous version of createTextSignal.
 * Uses sync hash (node-only for crypto, simple hash in browser).
 */
export function createTextSignalSync(rawText: string): TextSignal {
  const normalized = normalizeText(rawText);
  const len = normalized.length;

  if (len === 0) {
    return { kind: "none" };
  }

  const kind = isMixedContent(rawText) ? "mixed" : classifyText(normalized);
  const hash = sha256Sync(normalized);

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
  return normalized.length > 0 && /[a-z0-9]/i.test(normalized);
}
