# Contributing to @mcptoolshop/websketch-ir

Thank you for your interest in contributing! This document provides guidelines for contributing to the WebSketch IR library.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/websketch-ir.git
   cd websketch-ir
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Workflow

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run coverage
```

### Type Checking and Linting

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Full validation (build + typecheck + lint + tests)
npm run validate
```

### Building

```bash
# Clean dist
npm run clean

# Build TypeScript
npm run build

# Test imports
node -e "import('@mcptoolshop/websketch-ir').then(() => console.log('✓ OK'))"
```

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules (run `npm run lint`)
- Write tests for new features
- Keep functions small and focused
- Add JSDoc comments for public APIs
- Export types and functions in [src/index.ts](src/index.ts)

## Project Structure

```
src/
  grammar.ts           - Core type definitions
  text.ts              - Text normalization and hashing
  hash.ts              - Fingerprinting and similarity
  diff.ts              - Diff engine and formatting
  errors.ts            - Structured error types (WS_ codes)
  compat.ts            - Backward compatibility helpers
  render/
    ascii.ts           - ASCII rendering
  codegen/
    index.ts           - Codegen public exports
    html.ts            - HTML code generation
  index.ts             - Public API exports

tests/
  fixtures/            - Test captures
  ascii.test.ts        - ASCII rendering tests
  invariance.test.ts   - Fingerprint stability tests
```

## Testing Guidelines

### Test Coverage

We aim for high test coverage. When adding features:

1. Add unit tests for new functions
2. Add integration tests for new workflows
3. Add fixture captures if testing specific UI patterns
4. Test edge cases (empty captures, malformed data)

### Test Quality

Placeholder tests are not allowed on `main`. If a feature needs tests but you can't write them yet, use `it.skip('description', ...)` with a link to a tracking issue. The CI will reject patterns like `expect(true).toBe(true)` or `expect(1 + 1).toBe(2)`.

### Vitest Conventions

This project uses [Vitest](https://vitest.dev) as its test runner. Tests are ESM-native and run with `--experimental-vm-modules`. Key conventions:

- Test files live in `tests/` or `src/__tests__/` and use the `.test.ts` extension
- Use `describe` / `it` / `expect` from Vitest (no explicit imports needed)
- Run `npm test` for watch mode during development, `npm run test:run` for a single pass
- Coverage reports are generated with `npm run coverage` (uses `@vitest/coverage-v8`)

### Creating Test Fixtures

Place test captures in `tests/fixtures/`:

```typescript
// Load a test capture
const capture = JSON.parse(
  fs.readFileSync('tests/fixtures/my-test/capture.json', 'utf-8')
);
```

## Commit Guidelines

Use clear, descriptive commit messages:

```
feat: add layout-only fingerprint option
fix: handle empty text signals in diff
docs: update API examples in README
test: add tests for bbox similarity
refactor: simplify node matching algorithm
```

Prefix types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `chore`: Maintenance tasks

## Submitting Changes

1. **Create a branch** for your changes:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

3. **Run validation**:
   ```bash
   npm run validate
   ```

4. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Open a Pull Request** on GitHub

### Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Coverage maintained or improved
- [ ] Documentation updated (README, JSDoc)
- [ ] CHANGELOG.md updated with changes
- [ ] Commit messages are clear

## API Design Principles

### 1. Exported Types and Functions

All public APIs must be exported from `src/index.ts`:

```typescript
export type { MyType } from './module.js';
export { myFunction } from './module.js';
```

### 2. Type Safety

Use TypeScript strict mode features:

```typescript
// Good: explicit types
function processNode(node: UINode): string {
  ...
}

// Avoid: implicit any
function process(data) {  // ❌
  ...
}
```

### 3. Immutability

Prefer immutable operations:

```typescript
// Good: return new object
function updateCapture(capture: WebSketchCapture): WebSketchCapture {
  return { ...capture, timestamp_ms: Date.now() };
}

// Avoid: mutation
function updateCapture(capture: WebSketchCapture) {  // ❌
  capture.timestamp_ms = Date.now();
}
```

### 4. Error Handling

Provide clear error messages:

```typescript
if (!node.bbox) {
  throw new Error(`Node ${node.id} missing required bbox property`);
}
```

## Adding New Features

### 1. Grammar Changes

If adding to the grammar (types in `grammar.ts`):

1. Update type definitions
2. Update CHANGELOG with breaking changes
3. Add tests for new properties
4. Consider backward compatibility

### 2. Rendering Changes

If modifying ASCII rendering:

1. Test with multiple fixture captures
2. Ensure deterministic output
3. Maintain grid constraints
4. Update legend if adding role abbreviations

### 3. Diff Engine Changes

If modifying the diff algorithm:

1. Test with identical captures (should show no changes)
2. Test with known differences
3. Verify change descriptions are clear
4. Maintain performance for large trees

## Performance Considerations

- Keep fingerprinting fast (used for comparison)
- Avoid deep recursion where possible
- Cache computed values when appropriate
- Test with large captures (>100 nodes)

## Documentation

### JSDoc Comments

Add JSDoc to all exported functions:

```typescript
/**
 * Compute structural fingerprint for a capture.
 * 
 * @param capture - The WebSketch capture to fingerprint
 * @returns SHA-256 hash of the normalized structure
 * @example
 * ```typescript
 * const fp = fingerprintCapture(capture);
 * console.log(fp); // "e33442b6..."
 * ```
 */
export function fingerprintCapture(capture: WebSketchCapture): string {
  ...
}
```

### README Updates

Update README.md when:
- Adding new public APIs
- Changing existing APIs (breaking changes)
- Adding new examples
- Updating usage patterns

## Questions or Issues?

- Open an issue on GitHub for bugs or feature requests
- Check existing issues before creating new ones
- Be respectful and constructive in discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
