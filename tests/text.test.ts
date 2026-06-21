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
  it("removes zero-width characters", () => {
    const result = normalizeText("hello\u200Bworld");
    expect(result).toBe("helloworld");
  });

  it("removes soft hyphen", () => {
    const result = normalizeText("soft\u00ADhyphen");
    expect(result).toBe("softhyphen");
  });

  it("removes FEFF BOM", () => {
    const result = normalizeText("\uFEFFhello");
    expect(result).toBe("hello");
  });

  it("removes word joiner U+2060", () => {
    const result = normalizeText("a\u2060b");
    expect(result).toBe("ab");
  });

  it("collapses whitespace to single space", () => {
    expect(normalizeText("hello   world")).toBe("hello world");
    expect(normalizeText("hello\t\tworld")).toBe("hello world");
    expect(normalizeText("hello\n\nworld")).toBe("hello world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
    expect(normalizeText("\t\nhello\n\t")).toBe("hello");
  });

  it("lowercases text", () => {
    expect(normalizeText("HELLO WORLD")).toBe("hello world");
    expect(normalizeText("MiXeD cAsE")).toBe("mixed case");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeText("   ")).toBe("");
    expect(normalizeText("\t\n\r")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeText("")).toBe("");
  });

  it("handles combined invisible chars + whitespace + case", () => {
    const result = normalizeText("  \u200B Hello \uFEFF  WORLD  ");
    expect(result).toBe("hello world");
  });
});

// =============================================================================
// classifyText thresholds
// =============================================================================

describe("classifyText thresholds", () => {
  it("empty string → 'none'", () => {
    expect(classifyText("")).toBe("none");
  });

  it("1 char → 'short'", () => {
    expect(classifyText("a")).toBe("short");
  });

  it("20 chars → 'short' (boundary)", () => {
    expect(classifyText("a".repeat(20))).toBe("short");
  });

  it("21 chars → 'sentence'", () => {
    expect(classifyText("a".repeat(21))).toBe("sentence");
  });

  it("150 chars → 'sentence' (boundary)", () => {
    expect(classifyText("a".repeat(150))).toBe("sentence");
  });

  it("151 chars → 'paragraph'", () => {
    expect(classifyText("a".repeat(151))).toBe("paragraph");
  });

  it("500 chars → 'paragraph'", () => {
    expect(classifyText("a".repeat(500))).toBe("paragraph");
  });

  it("1000 chars → 'paragraph'", () => {
    expect(classifyText("a".repeat(1000))).toBe("paragraph");
  });
});

// =============================================================================
// isMixedContent
// =============================================================================

describe("isMixedContent", () => {
  it("returns false for single paragraph", () => {
    expect(isMixedContent("Hello world. This is a sentence.")).toBe(false);
  });

  it("returns false for single blank line", () => {
    expect(isMixedContent("Paragraph one.\n\nParagraph two.")).toBe(false);
  });

  it("returns true for 2+ blank line separators", () => {
    expect(isMixedContent("Para one.\n\nPara two.\n\nPara three.")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isMixedContent("")).toBe(false);
  });

  it("handles whitespace between newlines", () => {
    expect(isMixedContent("A\n  \nB\n  \nC")).toBe(true);
  });
});

// =============================================================================
// createTextSignalSync
// =============================================================================

describe("createTextSignalSync", () => {
  it("empty text → kind: 'none', no hash/len", () => {
    const signal = createTextSignalSync("");
    expect(signal.kind).toBe("none");
    expect(signal.hash).toBeUndefined();
    expect(signal.len).toBeUndefined();
  });

  it("whitespace-only text → kind: 'none'", () => {
    const signal = createTextSignalSync("   \t\n  ");
    expect(signal.kind).toBe("none");
  });

  it("short text → kind: 'short' with hash and len", () => {
    const signal = createTextSignalSync("Hello");
    expect(signal.kind).toBe("short");
    expect(signal.hash).toBeTruthy();
    expect(signal.len).toBe(5);
  });

  it("sentence text → kind: 'sentence'", () => {
    const text = "This is a sentence that is long enough to exceed the short threshold of twenty characters.";
    const signal = createTextSignalSync(text);
    expect(signal.kind).toBe("sentence");
    expect(signal.hash).toBeTruthy();
    expect(signal.len).toBeGreaterThan(20);
  });

  it("paragraph text → kind: 'paragraph'", () => {
    const text = "a".repeat(200);
    const signal = createTextSignalSync(text);
    expect(signal.kind).toBe("paragraph");
  });

  it("mixed content → kind: 'mixed'", () => {
    const text = "Paragraph one.\n\nParagraph two.\n\nParagraph three.";
    const signal = createTextSignalSync(text);
    expect(signal.kind).toBe("mixed");
    expect(signal.hash).toBeTruthy();
  });

  it("normalizes before hashing (case-insensitive)", () => {
    const a = createTextSignalSync("Hello World");
    const b = createTextSignalSync("hello world");
    expect(a.hash).toBe(b.hash);
  });

  it("normalizes whitespace before hashing", () => {
    const a = createTextSignalSync("hello   world");
    const b = createTextSignalSync("hello world");
    expect(a.hash).toBe(b.hash);
  });
});

// =============================================================================
// hashSync determinism
// =============================================================================

describe("hashSync determinism", () => {
  it("same input → same output", () => {
    expect(hashSync("hello")).toBe(hashSync("hello"));
  });

  it("different input → different output", () => {
    expect(hashSync("hello")).not.toBe(hashSync("world"));
  });

  it("returns 16-char hex string", () => {
    expect(hashSync("test")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("empty string is valid input", () => {
    const result = hashSync("");
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it("long string is deterministic", () => {
    const longText = "x".repeat(10000);
    expect(hashSync(longText)).toBe(hashSync(longText));
  });
});

// =============================================================================
// isMeaningfulText edge cases
// =============================================================================

describe("isMeaningfulText edge cases", () => {
  it("alphanumeric text → true", () => {
    expect(isMeaningfulText("hello")).toBe(true);
    expect(isMeaningfulText("123")).toBe(true);
    expect(isMeaningfulText("abc123")).toBe(true);
  });

  it("empty string → false", () => {
    expect(isMeaningfulText("")).toBe(false);
  });

  it("whitespace only → false", () => {
    expect(isMeaningfulText("   ")).toBe(false);
  });

  it("symbols only → false", () => {
    expect(isMeaningfulText("---")).toBe(false);
    expect(isMeaningfulText("***")).toBe(false);
    expect(isMeaningfulText("...")).toBe(false);
  });

  it("mixed symbols and letters → true", () => {
    expect(isMeaningfulText("---a")).toBe(true);
    expect(isMeaningfulText("$100")).toBe(true);
  });

  it("invisible chars only → false", () => {
    expect(isMeaningfulText("\u200B\u200C\u200D")).toBe(false);
  });

  it("invisible chars plus letter → true", () => {
    expect(isMeaningfulText("\u200Ba")).toBe(true);
  });

  it("uppercase letters → true (case-insensitive check)", () => {
    expect(isMeaningfulText("ABC")).toBe(true);
  });
});
