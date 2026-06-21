# Changelog

## 2.1.0 — 2026-03-28

### Added
- **Tree traversal utilities**: `flattenNodes`, `walkNodes`, `filterNodes` for DFS traversal
- **Query API**: `queryByRole`, `findFirst`, `findByRole` for searching node trees
- **Builder/factory API**: `createNode`, `createCapture` for programmatic capture construction
- **JSON renderer**: `renderJSON` — minimal structured output for LLM tool-calling
- **Markdown renderer**: `renderMarkdown` — LLM-friendly Markdown output mapping roles to headers, lists, tables
- **LLM diff summary**: `formatDiffForLLM` — concise human-readable change summary
- **Diff pre-processing**: `prepareDiff` / `PreparedCapture` — pre-flatten captures for repeated diffs
- **ROLES export**: `ROLES` array and `ROLES_SET` for programmatic role discovery
- **RENDERERS registry**: `{ html, ascii, llm, json, markdown }` for programmatic renderer discovery
- **Performance benchmarks**: vitest bench suite for diff, hash, render operations
- **Code coverage**: `@vitest/coverage-v8` integrated in CI
- **Handbook**: migration guide (v1→v2), recipes/cookbook page

### Fixed
- Prototype pollution guard now sanitizes all nested objects (not just top-level)
- TEXT_THRESHOLDS: PARAGRAPH threshold raised to 500 (was equal to SENTENCE at 150)
- Diff O(n²) safeguard: `maxDiffNodes` option (default 2000) prevents runaway matching
- Handler collision: same-event handlers concatenated with `;` instead of overwriting
- ASCII renderer: container labels render inside boxes, not on border
- Hash: null-byte field separators prevent cross-field collisions
- nodeSimilarity: explicit mismatch penalty for different semantics
- Validation: circular reference detection, multi-error collection (up to 3 limit violations)
- Input size limits on `parse()` (50K lines, 2MB default)
- Version check uses dynamic SUPPORTED_SCHEMA_VERSIONS instead of hardcoded string
- Error class `name` property set correctly for logging
- normalizeText LRU cache (1000 entries) for repeated text
- Runtime type guards for JavaScript consumers on public functions
- 15+ documentation accuracy fixes (package names, primitive counts, API signatures)

### Changed
- Node engine requirement bumped to >=20.0.0 (Node 18 is EOL)
- TruffleHog CI action SHA-pinned
- Publish workflow no longer masks failures with continue-on-error
- CI tests Node 20 + 22 matrix
- Legacy `.eslintrc.cjs` removed (flat config only)

## 2.0.1 — 2026-03-25

### Fixed
- SHA-pin CI workflow actions (checkout, setup-node, codecov, pages actions) for supply chain security
- Bump picomatch to 4.0.2 to resolve ReDoS vulnerability (CVE-2024-4067)
- Add `tests/**` to CI push paths filter so test-only changes trigger the pipeline

## 2.0.0 — 2026-03-04

### Breaking
- **64-bit hashing**: `hashSync` now returns 16-character hex strings (FNV-1a 64-bit) instead of 8-character (djb2 32-bit). All fingerprints, node hashes, and content-addressed IDs have changed. If you stored hashes externally, they will no longer match.
- `sha256Sync` (deprecated alias) updated to match — still an alias for `hashSync`.

### Added
- **PatternSignal**: new `pattern` field on `UINode` for identifying reusable UI compositions (`search_bar`, `auth_form`, `product_card`, `nav_menu`, `data_table`, `wizard_step`, `media_player`, `chat_thread`, `dashboard_widget`, `custom`)
- `PatternKind` type and `VALID_PATTERN_KINDS` constant
- `PatternSignal` interface with `kind`, `name`, `variant`, and `slot` fields
- Pattern validation in `validateCapture()`
- Pattern included in `hashNodeShallow` / `hashNodeDeep` (via `includePattern` option, default: `true`)
- Pattern similarity scoring in `nodeSimilarity()`
- Pattern emitted as `data-wsk-pattern`, `data-wsk-pattern-name`, `data-wsk-pattern-variant`, `data-wsk-pattern-slot` attributes in HTML codegen
- `includePattern` option in `EmitHTMLOptions` and `HashOptions`

### Changed
- `hashSync` upgraded from djb2 (32-bit) to FNV-1a (64-bit) for dramatically lower collision probability in large captures
- README.md fully rewritten with comprehensive feature documentation, grammar reference, and human-friendly tone

## 1.0.0 — 2026-02-27

### Changed
- Promoted to v1.0.0 — production-ready release
- Added SECURITY.md, SHIP_GATE.md, SCORECARD.md
- Added Security & Data Scope and Scorecard to README

## 0.4.0 — 2026-02-18

### Added
- HANDBOOK.md — deep-dive guide covering grammar model, API reference, diffing, fingerprinting, error handling, and integration

### Changed
- README.md — rewritten with "At a Glance" section, ecosystem table, docs table, standardized badge row

## 0.3.1

- **feat**: Schema version compatibility helpers (`isSupportedSchemaVersion`, `CURRENT_SCHEMA_VERSION`, `SUPPORTED_SCHEMA_VERSIONS`)
- **feat**: Version validation in `validateCapture()` now uses `compat.ts` (extensible for future versions)
- **docs**: Getting Started workflow, schema versioning rules, error code reference
- **docs**: CHANGELOG.md

## 0.3.0

- **feat**: Error taxonomy (`WebSketchException`, `WebSketchError`, canonical error codes)
- **feat**: `validateCapture()` with resource limits (`maxNodes`, `maxDepth`, `maxStringLength`)
- **feat**: `parseCapture()` for strict parse + validate with typed exceptions
- **feat**: `formatWebSketchError()` for human-readable error output

## 0.2.0

- **feat**: ASCII rendering (`renderAscii`, `renderForLLM`, `renderStructure`)
- **feat**: Structural diff (`diff`, `formatDiff`, `formatDiffJson`)
- **feat**: Fingerprinting (`fingerprintCapture`, `fingerprintLayout`)
- **feat**: Text processing (`normalizeText`, `createTextSignal`, `hashSync`)
- **feat**: Node hashing and similarity scoring

## 0.1.0

- Initial release
- Grammar types (`UINode`, `UIRole`, `BBox01`, `WebSketchCapture`)
- Constants (`MAX_DEPTH`, `MAX_CHILDREN`, `BBOX_QUANT_STEP`)
