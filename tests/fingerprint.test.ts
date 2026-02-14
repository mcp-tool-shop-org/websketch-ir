import { describe, it, expect } from "vitest";
import {
  fingerprintCapture,
  fingerprintLayout,
  BBOX_QUANT_STEP,
} from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { minimal, loginPage, textNode, repeatedSiblings } from "./fixtures/captures.js";

// =============================================================================
// Idempotency
// =============================================================================

describe("fingerprintCapture idempotency", () => {
  it("returns the same fingerprint on repeated calls (minimal)", () => {
    const a = fingerprintCapture(minimal);
    const b = fingerprintCapture(minimal);
    expect(a).toBe(b);
  });

  it("returns the same fingerprint on repeated calls (loginPage)", () => {
    const a = fingerprintCapture(loginPage);
    const b = fingerprintCapture(loginPage);
    expect(a).toBe(b);
  });
});

// =============================================================================
// Sensitivity to meaningful changes
// =============================================================================

describe("fingerprintCapture changes when meaningful fields change", () => {
  const base = fingerprintCapture(minimal);

  it("changes when root role changes", () => {
    const altered = makeCapture(makeNode("SECTION", [0, 0, 1, 1] as const));
    expect(fingerprintCapture(altered)).not.toBe(base);
  });

  it("changes when bbox changes by more than BBOX_QUANT_STEP", () => {
    const altered = makeCapture(
      makeNode("PAGE", [0, 0, 0.9, 1] as const)
    );
    expect(fingerprintCapture(altered)).not.toBe(base);
  });

  it("changes when interactive flag changes", () => {
    const altered = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, { interactive: true })
    );
    expect(fingerprintCapture(altered)).not.toBe(base);
  });

  it("changes when text hash changes", () => {
    const altered = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        text: makeText("short", { hash: "different_hash", len: 10 }),
      })
    );
    expect(fingerprintCapture(altered)).not.toBe(base);
  });

  it("changes when viewport aspect changes", () => {
    const altered = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const),
      { viewport: { w_px: 1080, h_px: 1920, aspect: 1080 / 1920 } }
    );
    expect(fingerprintCapture(altered)).not.toBe(base);
  });
});

// =============================================================================
// Stability under irrelevant changes
// =============================================================================

describe("fingerprintCapture stable under irrelevant changes", () => {
  const base = fingerprintCapture(minimal);

  it("unchanged when timestamp_ms changes", () => {
    const altered = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const),
      { timestamp_ms: 9999999999999 }
    );
    expect(fingerprintCapture(altered)).toBe(base);
  });

  it("unchanged when url changes", () => {
    const altered = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const),
      { url: "https://different.com" }
    );
    expect(fingerprintCapture(altered)).toBe(base);
  });

  it("unchanged when compiler version changes", () => {
    const altered = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const),
      { compiler: { name: "websketch-ir", version: "9.9.9", options_hash: "other" } }
    );
    expect(fingerprintCapture(altered)).toBe(base);
  });
});

// =============================================================================
// Layout fingerprint vs full fingerprint
// =============================================================================

describe("fingerprintLayout ignores text/name", () => {
  it("same layout fingerprint when only text differs", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        text: makeText("short", { hash: "aaa", len: 3 }),
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        text: makeText("paragraph", { hash: "zzz", len: 999 }),
      })
    );
    expect(fingerprintLayout(a)).toBe(fingerprintLayout(b));
  });

  it("different layout fingerprint when bbox differs", () => {
    const a = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const));
    const b = makeCapture(makeNode("PAGE", [0, 0, 0.5, 0.5] as const));
    expect(fingerprintLayout(a)).not.toBe(fingerprintLayout(b));
  });

  it("full fingerprint differs when text differs but layout does not", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        text: makeText("short", { hash: "aaa", len: 3 }),
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        text: makeText("paragraph", { hash: "zzz", len: 999 }),
      })
    );
    expect(fingerprintCapture(a)).not.toBe(fingerprintCapture(b));
  });
});

// =============================================================================
// Sibling order normalization
// =============================================================================

describe("sibling order normalization", () => {
  it("same fingerprint regardless of child input order (different Y positions)", () => {
    const childA = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true });
    const childB = makeNode("BUTTON", [0.1, 0.3, 0.2, 0.1] as const, { interactive: true });
    const childC = makeNode("BUTTON", [0.1, 0.5, 0.2, 0.1] as const, { interactive: true });

    const ordered = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childA, childB, childC] })
    );
    const reversed = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, { children: [childC, childA, childB] })
    );

    expect(fingerprintCapture(ordered)).toBe(fingerprintCapture(reversed));
  });

  it("same fingerprint regardless of child input order (different X positions, same Y)", () => {
    // repeatedSiblings fixture has 5 cards at same Y, different X
    const fp = fingerprintCapture(repeatedSiblings);

    // Shuffle the LIST children
    const shuffled = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("LIST", [0, 0.1, 1, 0.8] as const, {
            children: [
              makeNode("CARD", [0.8, 0.1, 0.18, 0.3] as const, { semantic: "card_e" }),
              makeNode("CARD", [0.2, 0.1, 0.18, 0.3] as const, { semantic: "card_b" }),
              makeNode("CARD", [0.6, 0.1, 0.18, 0.3] as const, { semantic: "card_d" }),
              makeNode("CARD", [0.0, 0.1, 0.18, 0.3] as const, { semantic: "card_a" }),
              makeNode("CARD", [0.4, 0.1, 0.18, 0.3] as const, { semantic: "card_c" }),
            ],
          }),
        ],
      })
    );

    expect(fingerprintCapture(shuffled)).toBe(fp);
  });
});

// =============================================================================
// Golden snapshots
// =============================================================================

describe("golden fingerprint snapshots", () => {
  it("fingerprintCapture(minimal)", () => {
    expect(fingerprintCapture(minimal)).toMatchInlineSnapshot(`"29338a9f"`);
  });

  it("fingerprintCapture(loginPage)", () => {
    expect(fingerprintCapture(loginPage)).toMatchInlineSnapshot(`"c29a74ed"`);
  });

  it("fingerprintLayout(loginPage)", () => {
    expect(fingerprintLayout(loginPage)).toMatchInlineSnapshot(`"756f793b"`);
  });
});
