import { describe, it, expect } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  isSupportedSchemaVersion,
} from "../src/compat";

describe("CURRENT_SCHEMA_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof CURRENT_SCHEMA_VERSION).toBe("string");
    expect(CURRENT_SCHEMA_VERSION.length).toBeGreaterThan(0);
  });

  it("is itself a supported version", () => {
    expect(SUPPORTED_SCHEMA_VERSIONS.has(CURRENT_SCHEMA_VERSION)).toBe(true);
  });
});

describe("SUPPORTED_SCHEMA_VERSIONS", () => {
  it("contains at least one version", () => {
    expect(SUPPORTED_SCHEMA_VERSIONS.size).toBeGreaterThanOrEqual(1);
  });

  it('includes "0.1"', () => {
    expect(SUPPORTED_SCHEMA_VERSIONS.has("0.1")).toBe(true);
  });
});

describe("isSupportedSchemaVersion", () => {
  it('returns true for "0.1"', () => {
    expect(isSupportedSchemaVersion("0.1")).toBe(true);
  });

  it("returns false for unknown version strings", () => {
    expect(isSupportedSchemaVersion("0.2")).toBe(false);
    expect(isSupportedSchemaVersion("1.0")).toBe(false);
    expect(isSupportedSchemaVersion("2.0")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isSupportedSchemaVersion(null)).toBe(false);
    expect(isSupportedSchemaVersion(undefined)).toBe(false);
    expect(isSupportedSchemaVersion(0.1)).toBe(false);
    expect(isSupportedSchemaVersion(1)).toBe(false);
    expect(isSupportedSchemaVersion(true)).toBe(false);
    expect(isSupportedSchemaVersion({})).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSupportedSchemaVersion("")).toBe(false);
  });
});
