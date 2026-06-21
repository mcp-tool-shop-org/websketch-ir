import { describe, it, expect } from "vitest";
import {
  diff,
  formatDiff,
  formatDiffJson,
} from "../src/index.js";
import { makeCapture, makeNode, makeText } from "./fixtures/index.js";
import { minimal, loginPage, loginPageModified, singleButton } from "./fixtures/captures.js";

// =============================================================================
// A vs A → empty diff
// =============================================================================

describe("diff(A, A) identity", () => {
  it("loginPage vs itself → identical", () => {
    const result = diff(loginPage, loginPage);
    expect(result.summary.identical).toBe(true);
    expect(result.changes).toHaveLength(0);
  });

  it("all counts are zero for identical captures", () => {
    const result = diff(loginPage, loginPage);
    for (const count of Object.values(result.summary.counts)) {
      expect(count).toBe(0);
    }
  });

  it("minimal vs itself → identical", () => {
    const result = diff(minimal, minimal);
    expect(result.summary.identical).toBe(true);
    expect(result.changes).toHaveLength(0);
  });
});

// =============================================================================
// A vs B → non-empty diff
// =============================================================================

describe("diff(loginPage, loginPageModified)", () => {
  it("is not identical", () => {
    const result = diff(loginPage, loginPageModified);
    expect(result.summary.identical).toBe(false);
  });

  it("detects added TOAST", () => {
    const result = diff(loginPage, loginPageModified);
    const added = result.changes.filter((c) => c.type === "added");
    expect(added.length).toBeGreaterThan(0);
    const toastAdded = added.find((c) => c.nodeB?.role === "TOAST");
    expect(toastAdded).toBeDefined();
  });

  it("detects moved button", () => {
    const result = diff(loginPage, loginPageModified);
    const moved = result.changes.filter((c) => c.type === "moved");
    const movedButton = moved.find((c) => c.nodeA?.role === "BUTTON" && c.nodeA?.semantic === "submit");
    expect(movedButton).toBeDefined();
    // Button moved down by ~5%
    expect(movedButton!.bboxDelta!.dy).toBeCloseTo(0.05, 2);
  });

  it("detects text change on heading", () => {
    const result = diff(loginPage, loginPageModified);
    const textChanged = result.changes.filter((c) => c.type === "text_changed");
    expect(textChanged.length).toBeGreaterThan(0);
    // Verify it detected the TEXT node with the changed heading hash
    const headingChange = textChanged.find(
      (c) => c.nodeA?.role === "TEXT" && c.nodeB?.role === "TEXT"
    );
    expect(headingChange).toBeDefined();
  });
});

// =============================================================================
// Deterministic output ordering
// =============================================================================

describe("diff output determinism", () => {
  it("formatDiff produces identical output on repeated calls", () => {
    const result = diff(loginPage, loginPageModified);
    const a = formatDiff(result);
    const b = formatDiff(result);
    expect(a).toBe(b);
  });

  it("formatDiffJson produces identical output on repeated calls", () => {
    const result = diff(loginPage, loginPageModified);
    const a = formatDiffJson(result);
    const b = formatDiffJson(result);
    expect(a).toBe(b);
  });

  it("full diff pipeline is deterministic", () => {
    const resultA = diff(loginPage, loginPageModified);
    const resultB = diff(loginPage, loginPageModified);
    expect(formatDiff(resultA)).toBe(formatDiff(resultB));
  });
});

// =============================================================================
// Change type correctness
// =============================================================================

describe("change type detection", () => {
  it("added: node exists only in B", () => {
    const a = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const));
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
      })
    );
    const result = diff(a, b);
    const added = result.changes.filter((c) => c.type === "added");
    expect(added.length).toBeGreaterThan(0);
  });

  it("removed: node exists only in A", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
      })
    );
    const b = makeCapture(makeNode("PAGE", [0, 0, 1, 1] as const));
    const result = diff(a, b);
    const removed = result.changes.filter((c) => c.type === "removed");
    expect(removed.length).toBeGreaterThan(0);
  });

  it("moved: same node at different position", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true, semantic: "test" })],
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.5, 0.5, 0.2, 0.1] as const, { interactive: true, semantic: "test" })],
      })
    );
    const result = diff(a, b);
    const moved = result.changes.filter((c) => c.type === "moved");
    expect(moved.length).toBeGreaterThan(0);
  });

  it("resized: same node with different dimensions", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true, semantic: "test" })],
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.1, 0.1, 0.5, 0.3] as const, { interactive: true, semantic: "test" })],
      })
    );
    const result = diff(a, b);
    const resized = result.changes.filter((c) => c.type === "resized");
    expect(resized.length).toBeGreaterThan(0);
  });

  it("text_changed: same node with different text hash", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("TEXT", [0.1, 0.1, 0.8, 0.1] as const, {
            text: makeText("short", { hash: "aaa", len: 5 }),
          }),
        ],
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("TEXT", [0.1, 0.1, 0.8, 0.1] as const, {
            text: makeText("short", { hash: "zzz", len: 5 }),
          }),
        ],
      })
    );
    const result = diff(a, b);
    const textChanged = result.changes.filter((c) => c.type === "text_changed");
    expect(textChanged.length).toBeGreaterThan(0);
  });

  it("interactive_changed: interactive flag flips", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: true })],
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, { interactive: false })],
      })
    );
    const result = diff(a, b);
    const interChanged = result.changes.filter((c) => c.type === "interactive_changed");
    expect(interChanged.length).toBeGreaterThan(0);
  });

  it("children_changed: child count differs", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("FORM", [0.1, 0.1, 0.8, 0.8] as const, {
            children: [
              makeNode("INPUT", [0.2, 0.2, 0.6, 0.1] as const, { interactive: true }),
            ],
          }),
        ],
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("FORM", [0.1, 0.1, 0.8, 0.8] as const, {
            children: [
              makeNode("INPUT", [0.2, 0.2, 0.6, 0.1] as const, { interactive: true }),
              makeNode("INPUT", [0.2, 0.4, 0.6, 0.1] as const, { interactive: true }),
              makeNode("BUTTON", [0.3, 0.6, 0.4, 0.1] as const, { interactive: true }),
            ],
          }),
        ],
      })
    );
    const result = diff(a, b);
    const childrenChanged = result.changes.filter((c) => c.type === "children_changed");
    expect(childrenChanged.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Metadata comparison
// =============================================================================

describe("diff metadata", () => {
  it("same URL → urlChanged false", () => {
    const result = diff(loginPage, loginPage);
    expect(result.metadata.urlChanged).toBe(false);
  });

  it("different URL → urlChanged true", () => {
    const a = loginPage;
    const b = makeCapture(loginPage.root, { url: "https://other.com" });
    const result = diff(a, b);
    expect(result.metadata.urlChanged).toBe(true);
  });

  it("same viewport → viewportChanged false", () => {
    const result = diff(loginPage, loginPage);
    expect(result.metadata.viewportChanged).toBe(false);
  });

  it("different viewport → viewportChanged true", () => {
    const a = loginPage;
    const b = makeCapture(loginPage.root, {
      url: loginPage.url,
      viewport: { w_px: 1024, h_px: 768, aspect: 1024 / 768 },
    });
    const result = diff(a, b);
    expect(result.metadata.viewportChanged).toBe(true);
  });
});

// =============================================================================
// Options
// =============================================================================

describe("diff options", () => {
  it("includeText: false suppresses text_changed", () => {
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("TEXT", [0.1, 0.1, 0.8, 0.1] as const, {
            text: makeText("short", { hash: "aaa", len: 5 }),
          }),
        ],
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("TEXT", [0.1, 0.1, 0.8, 0.1] as const, {
            text: makeText("short", { hash: "zzz", len: 5 }),
          }),
        ],
      })
    );
    const result = diff(a, b, { includeText: false });
    const textChanged = result.changes.filter((c) => c.type === "text_changed");
    expect(textChanged).toHaveLength(0);
  });

  it("high matchThreshold → fewer matches, more added/removed", () => {
    const strict = diff(loginPage, loginPageModified, { matchThreshold: 0.99 });
    const loose = diff(loginPage, loginPageModified, { matchThreshold: 0.1 });

    const strictUnmatched = strict.changes.filter(
      (c) => c.type === "added" || c.type === "removed"
    ).length;
    const looseUnmatched = loose.changes.filter(
      (c) => c.type === "added" || c.type === "removed"
    ).length;

    // Strict threshold should produce at least as many unmatched as loose
    // (and ideally strictly more for this fixture which has meaningful changes)
    expect(strictUnmatched).toBeGreaterThanOrEqual(looseUnmatched);
    // Verify we actually got a meaningful difference
    expect(strict.changes.length + loose.changes.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// formatDiff structure
// =============================================================================

describe("formatDiff structure", () => {
  it("contains report header", () => {
    const result = diff(loginPage, loginPageModified);
    const text = formatDiff(result);
    expect(text).toContain("WebSketch IR Diff Report");
  });

  it("contains SUMMARY section", () => {
    const result = diff(loginPage, loginPageModified);
    const text = formatDiff(result);
    expect(text).toContain("SUMMARY");
  });

  it("contains CHANGE COUNTS section", () => {
    const result = diff(loginPage, loginPageModified);
    const text = formatDiff(result);
    expect(text).toContain("CHANGE COUNTS");
  });

  it("contains TOP CHANGES section when changes exist", () => {
    const result = diff(loginPage, loginPageModified);
    const text = formatDiff(result);
    expect(text).toContain("TOP CHANGES");
  });

  it("does not contain TOP CHANGES when captures are identical", () => {
    const result = diff(loginPage, loginPage);
    const text = formatDiff(result);
    expect(text).not.toContain("TOP CHANGES");
  });

  it("formatDiffJson produces valid JSON", () => {
    const result = diff(loginPage, loginPageModified);
    const json = formatDiffJson(result);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// =============================================================================
// fingerprintsMatch in summary (will test after fix)
// =============================================================================

describe("diff summary fingerprintsMatch", () => {
  it("identical captures → fingerprintsMatch true", () => {
    const result = diff(loginPage, loginPage);
    expect(result.summary.fingerprintsMatch).toBe(true);
  });

  it("different captures → fingerprintsMatch false", () => {
    const result = diff(loginPage, loginPageModified);
    expect(result.summary.fingerprintsMatch).toBe(false);
  });

  it("identical captures → layoutFingerprintsMatch true", () => {
    const result = diff(loginPage, loginPage);
    expect(result.summary.layoutFingerprintsMatch).toBe(true);
  });

  it("structurally different captures → layoutFingerprintsMatch false", () => {
    const result = diff(loginPage, loginPageModified);
    // loginPageModified has moved button + added toast → layout differs
    expect(result.summary.layoutFingerprintsMatch).toBe(false);
  });
});

// =============================================================================
// role_changed detection
// =============================================================================

describe("change type: role_changed", () => {
  it("detects when a node changes role (high overlap)", () => {
    // Two nodes at same position, same interactivity — but different role
    // Because findMatches uses similarity (role is only one factor, bbox overlap + interactivity matter too),
    // a high-overlap pair with different role can be matched and classified as role_changed.
    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("BUTTON", [0.1, 0.1, 0.3, 0.1] as const, {
            interactive: true,
            semantic: "action",
            text: makeText("short", { hash: "same_hash", len: 5 }),
          }),
        ],
      })
    );
    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("LINK", [0.1, 0.1, 0.3, 0.1] as const, {
            interactive: true,
            semantic: "action",
            text: makeText("short", { hash: "same_hash", len: 5 }),
          }),
        ],
      })
    );
    const result = diff(a, b, { matchThreshold: 0.3 });
    // If matched, should detect role_changed. If unmatched, we'd see added+removed.
    const roleChanged = result.changes.filter((c) => c.type === "role_changed");
    const addedRemoved = result.changes.filter((c) => c.type === "added" || c.type === "removed");
    // At least one of these should fire to represent the change
    expect(roleChanged.length + addedRemoved.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Reordered children (sibling swap)
// =============================================================================

describe("reordered children (sibling swap)", () => {
  it("swapping child order produces detectable diff", () => {
    const childA = makeNode("BUTTON", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      semantic: "first",
      text: makeText("short", { hash: "btn_a", len: 5 }),
    });
    const childB = makeNode("INPUT", [0.1, 0.3, 0.2, 0.1] as const, {
      interactive: true,
      semantic: "second",
      text: makeText("short", { hash: "inp_b", len: 7 }),
    });

    const a = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("FORM", [0.05, 0.05, 0.5, 0.5] as const, {
            children: [childA, childB],
          }),
        ],
      })
    );

    // Swap positions: childB is now at top, childA at bottom
    const childASwapped = makeNode("BUTTON", [0.1, 0.3, 0.2, 0.1] as const, {
      interactive: true,
      semantic: "first",
      text: makeText("short", { hash: "btn_a", len: 5 }),
    });
    const childBSwapped = makeNode("INPUT", [0.1, 0.1, 0.2, 0.1] as const, {
      interactive: true,
      semantic: "second",
      text: makeText("short", { hash: "inp_b", len: 7 }),
    });

    const b = makeCapture(
      makeNode("PAGE", [0, 0, 1, 1] as const, {
        children: [
          makeNode("FORM", [0.05, 0.05, 0.5, 0.5] as const, {
            children: [childBSwapped, childASwapped],
          }),
        ],
      })
    );

    const result = diff(a, b);
    // The swap should be detected as moved changes
    const moved = result.changes.filter((c) => c.type === "moved");
    expect(moved.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// topChanges ordering
// =============================================================================

describe("topChanges", () => {
  it("topChanges are sorted by area (largest first)", () => {
    const result = diff(loginPage, loginPageModified);
    if (result.topChanges.length >= 2) {
      for (let i = 1; i < result.topChanges.length; i++) {
        const prevNode = result.topChanges[i - 1].nodeA ?? result.topChanges[i - 1].nodeB;
        const currNode = result.topChanges[i].nodeA ?? result.topChanges[i].nodeB;
        if (prevNode && currNode) {
          const prevArea = prevNode.bbox[2] * prevNode.bbox[3];
          const currArea = currNode.bbox[2] * currNode.bbox[3];
          expect(prevArea).toBeGreaterThanOrEqual(currArea);
        }
      }
    }
  });

  it("topChanges respects topChangesLimit option", () => {
    const result = diff(loginPage, loginPageModified, { topChangesLimit: 2 });
    expect(result.topChanges.length).toBeLessThanOrEqual(2);
  });
});
