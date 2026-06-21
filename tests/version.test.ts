import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf-8");

describe("version consistency", () => {
  it("package.json version is valid semver", () => {
    const parts = pkg.version.split(".");
    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.slice(0, 3).every((p: string) => /^\d+$/.test(p))).toBe(true);
  });

  it("version is >= 1.0.0", () => {
    const major = Number(pkg.version.split(".")[0]);
    expect(major).toBeGreaterThanOrEqual(1);
  });

  it("CHANGELOG contains current version", () => {
    expect(changelog).toContain(pkg.version);
  });

  it("package name is scoped to @mcptoolshop", () => {
    expect(pkg.name).toMatch(/^@mcptoolshop\//);
  });

  it("exports field includes main and sub-paths", () => {
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.exports["./grammar"]).toBeDefined();
    expect(pkg.exports["./codegen"]).toBeDefined();
  });
});
