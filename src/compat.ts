/**
 * WebSketch IR — Schema Version Compatibility
 *
 * Rules:
 *   - Patch bumps (0.1 → 0.1): additive-only changes (new optional fields)
 *   - Minor bumps (0.1 → 0.2): non-breaking — new required fields may appear,
 *     but old captures remain valid via defaults
 *   - Major bumps (0.x → 1.0): breaking — old captures may not validate
 *
 * Forward compatibility: unknown fields are ignored (consumers MUST tolerate them).
 * Backward compatibility: validators accept any supported version.
 */

/** Current schema version produced by this version of websketch-ir. */
export const CURRENT_SCHEMA_VERSION = "0.1";

/** All schema versions this library can read. */
export const SUPPORTED_SCHEMA_VERSIONS: ReadonlySet<string> = new Set([
  "0.1",
]);

/**
 * Check whether a schema version string is supported by this library.
 *
 * Returns true for any version in SUPPORTED_SCHEMA_VERSIONS.
 * Returns false for null, undefined, empty, or unknown versions.
 */
export function isSupportedSchemaVersion(version: unknown): version is string {
  return typeof version === "string" && SUPPORTED_SCHEMA_VERSIONS.has(version);
}
