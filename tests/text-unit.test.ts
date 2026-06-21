import { describe, it, expect } from "vitest";
import {
  normalizeText,
  classifyText,
  isMixedContent,
  createTextSignalSync,
  hashSync,
  isMeaningfulText,
} from "../src/index.js";

// =============================================================================
// normalizeText
// =============================================================================

describe("normalizeText", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });

  it("lowercases text", () => {
    expect(normalizeText("Hello World")).toBe("hello world");
  });

  it("collapses internal whitespace to single space", () => {
    expect(normalizeText("hello   world")).toBe("hello world");
  });

  it("collapses tabs and newlines to single space", () => {
    expect(normalizeText("hello\t\n\r\nworld")).toBe("hello world");
  });

  it("strips zero-width characters", () => {
    // \u200B = zero-width space, \uFEFF = BOM
    expect(normalizeText("he\u200Bllo\uFEFF")).toBe("hello");
  });

  it("strips soft hyphen", () => {
    // \u00AD = soft hyphen
    expect(normalizeText("hel\u00ADlo")).toBe("hello");
  });

  it("strips word joiner and bidi characters", () => {
    // \u2060 = word joiner, \u202A = LRE
    expect(normalizeText("he\u2060l\u202Alo")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeText("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeText("   \t\n  ")).toBe("");
  });

  it("returns empty string for invisible-chars-only input", () => {
    expect(normalizeText("\u200B\uFEFF\u200D")).toBe("");
  });

  it("handles combined normalization: trim + collapse + lowercase + strip invisible", () => {
    expect(normalizeText("  Hello\u200B   World\uFEFF  ")).toBe("hello world");
  });
});

// =============================================================================
// classifyText thresholds
// =============================================================================

describe("classifyText thresholds", () => {
  it("empty string → none", () => {
    expect(classifyText("")).toBe("none");
  });

  it("1 char → short", () => {
    expect(classifyText("x")).toBe("short");
  });

  it("20 chars → short (boundary)", () => {
    expect(classifyText("a".repeat(20))).toBe("short");
  });

  it("21 chars → sentence", () => {
    expect(classifyText("a".repeat(21))).toBe("sentence");
  });

  it("150 chars → sentence (boundary)", () => {
    expect(classifyText("a".repeat(150))).toBe("sentence");
  });

  it("151 chars → paragraph", () => {
    expect(classifyText("a".repeat(151))).toBe("paragraph");
  });

  it("500 chars → paragraph", () => {
    expect(classifyText("a".repeat(500))).toBe("paragraph");
  });

  it("1000 chars → paragraph (beyond threshold still paragraph)", () => {
    expect(classifyText("a".repeat(1000))).toBe("paragraph");
  });
});

// =============================================================================
// isMixedContent
// =============================================================================

describe("isMixedContent", () => {
  it("returns false for single line", () => {
    expect(isMixedContent("just a line")).toBe(false);
  });

  it("returns false for single paragraph break", () => {
    expect(isMixedContent("first\n\nsecond")).toBe(false);
  });

  it("returns true for two or more paragraph breaks", () => {
    expect(isMixedContent("first\n\nsecond\n\nthird")).toBe(true);
  });

  it("returns true for multiple blank lines", () => {
    expect(isMixedContent("a\n\nb\n\nc\n\nd")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isMixedContent("")).toBe(false);
  });

  it("returns false for single newlines without blank line between", () => {
    expect(isMixedContent("line1\nline2\nline3")).toBe(false);
  });
});

// =============================================================================
// createTextSignalSync
// =============================================================================

describe("createTextSignalSync", () => {
  it("returns kind: none for empty text", () => {
    const signal = createTextSignalSync("");
    expect(signal.kind).toBe("none");
    expect(signal.hash).toBeUndefined();
    expect(signal.len).toBeUndefined();
  });

  it("returns kind: none for whitespace-only text", () => {
    const signal = createTextSignalSync("   ");
    expect(signal.kind).toBe("none");
  });

  it("returns correct shape for short text", () => {
    const signal = createTextSignalSync("Hello");
    expect(signal.kind).toBe("short");
    expect(signal.hash).toBeDefined();
    expect(typeof signal.hash).toBe("string");
    expect(signal.len).toBe(5); // "hello" after normalization
  });

  it("returns sentence kind for medium text", () => {
    const text = "This is a sentence that is longer than twenty characters easily.";
    const signal = createTextSignalSync(text);
    expect(signal.kind).toBe("sentence");
    expect(signal.len).toBeGreaterThan(20);
  });

  it("returns paragraph kind for long text", () => {
    const text = "a ".repeat(100); // 200 chars before normalization
    const signal = createTextSignalSync(text);
    expect(signal.kind).toBe("paragraph");
  });

  it("returns mixed kind when text has multiple paragraph breaks", () => {
    const text = "para one\n\npara two\n\npara three";
    const signal = createTextSignalSync(text);
    expect(signal.kind).toBe("mixed");
  });

  it("is deterministic (same input → same output)", () => {
    const a = createTextSignalSync("Hello World");
    const b = createTextSignalSync("Hello World");
    expect(a.hash).toBe(b.hash);
    expect(a.len).toBe(b.len);
    expect(a.kind).toBe(b.kind);
  });

  it("normalizes before hashing (case and whitespace)", () => {
    const a = createTextSignalSync("Hello World");
    const b = createTextSignalSync("  hello   world  ");
    expect(a.hash).toBe(b.hash);
    expect(a.len).toBe(b.len);
  });
});

// =============================================================================
// hashSync determinism
// =============================================================================

describe("hashSync determinism", () => {
  it("same input → same 16-char hex output", () => {
    const a = hashSync("test input");
    const b = hashSync("test input");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it("different inputs → different hashes", () => {
    expect(hashSync("hello")).not.toBe(hashSync("world"));
  });

  it("empty string produces a valid hash", () => {
    const result = hashSync("");
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it("long string produces a valid hash", () => {
    const result = hashSync("x".repeat(10000));
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });
});

// =============================================================================
// isMeaningfulText edge cases
// =============================================================================

describe("isMeaningfulText edge cases", () => {
  it("returns true for normal text", () => {
    expect(isMeaningfulText("Hello")).toBe(true);
  });

  it("returns true for text with numbers", () => {
    expect(isMeaningfulText("item 42")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isMeaningfulText("")).toBe(false);
  });

  it("returns false for whitespace only", () => {
    expect(isMeaningfulText("   ")).toBe(false);
  });

  it("returns false for symbols only (no alphanumeric)", () => {
    expect(isMeaningfulText("---")).toBe(false);
  });

  it("returns false for only invisible characters", () => {
    expect(isMeaningfulText("\u200B\uFEFF")).toBe(false);
  });

  it("returns true even with surrounding whitespace", () => {
    expect(isMeaningfulText("  a  ")).toBe(true);
  });

  it("returns false for special chars without alphanumeric", () => {
    expect(isMeaningfulText("!@#$%^&*()")).toBe(false);
  });

  it("returns true for single digit", () => {
    expect(isMeaningfulText("5")).toBe(true);
  });
});
