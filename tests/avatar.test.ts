import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	discoverAvatars,
	expandAvatarPaths,
	getBundledAvatarsDir,
	getUserAvatarsDir,
} from "../src/avatar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = join(__dirname, ".test-avatars");

const validManifest = {
	name: "test-avatar",
	author: "Test Author",
	version: "1.0.0",
	format: "webm",
	states: {
		idle: { file: "idle.webm" },
	},
};

const anotherValidManifest = {
	name: "another-avatar",
	author: "Another Author",
	version: "2.0.0",
	format: "mp4",
	states: {
		idle: { file: "idle.mp4" },
	},
};

describe("avatar module", () => {
	describe("getUserAvatarsDir", () => {
		it("returns the correct user avatars directory", () => {
			const result = getUserAvatarsDir();
			expect(result).toBe(join(homedir(), ".byteside", "avatars"));
		});
	});

	describe("getBundledAvatarsDir", () => {
		it("returns a path that exists", () => {
			const result = getBundledAvatarsDir();
			expect(existsSync(result)).toBe(true);
		});

		it("contains the default avatar", () => {
			const result = getBundledAvatarsDir();
			const defaultManifest = join(result, "default", "manifest.json");
			expect(existsSync(defaultManifest)).toBe(true);
		});
	});

	describe("expandAvatarPaths", () => {
		it("expands ~ to home directory", () => {
			const result = expandAvatarPaths(["~/.byteside/avatars"]);
			expect(result).toEqual([join(homedir(), ".byteside", "avatars")]);
		});

		it("expands standalone ~ to home directory", () => {
			const result = expandAvatarPaths(["~"]);
			expect(result).toEqual([homedir()]);
		});

		it("resolves relative paths", () => {
			const result = expandAvatarPaths(["./avatars"]);
			expect(result).toEqual([resolve("./avatars")]);
		});

		it("preserves absolute paths", () => {
			const result = expandAvatarPaths(["/absolute/path"]);
			expect(result).toEqual(["/absolute/path"]);
		});

		it("handles multiple paths", () => {
			const result = expandAvatarPaths(["~/first", "./second", "/third"]);
			expect(result).toEqual([join(homedir(), "first"), resolve("./second"), "/third"]);
		});

		it("handles empty array", () => {
			const result = expandAvatarPaths([]);
			expect(result).toEqual([]);
		});
	});

	describe("discoverAvatars", () => {
		beforeAll(async () => {
			// Create test directory structure
			await mkdir(testDir, { recursive: true });

			// Create valid avatar
			const validAvatarDir = join(testDir, "valid-avatar");
			await mkdir(validAvatarDir, { recursive: true });
			await writeFile(join(validAvatarDir, "manifest.json"), JSON.stringify(validManifest));

			// Create another valid avatar
			const anotherAvatarDir = join(testDir, "another-avatar");
			await mkdir(anotherAvatarDir, { recursive: true });
			await writeFile(
				join(anotherAvatarDir, "manifest.json"),
				JSON.stringify(anotherValidManifest),
			);

			// Create invalid avatar (no manifest)
			const noManifestDir = join(testDir, "no-manifest");
			await mkdir(noManifestDir, { recursive: true });

			// Create invalid avatar (bad JSON)
			const badJsonDir = join(testDir, "bad-json");
			await mkdir(badJsonDir, { recursive: true });
			await writeFile(join(badJsonDir, "manifest.json"), "{ invalid json }");

			// Create invalid avatar (invalid manifest schema)
			const invalidSchemaDir = join(testDir, "invalid-schema");
			await mkdir(invalidSchemaDir, { recursive: true });
			await writeFile(
				join(invalidSchemaDir, "manifest.json"),
				JSON.stringify({ name: "missing-fields" }),
			);
		});

		afterAll(async () => {
			// Clean up test directory
			await rm(testDir, { recursive: true, force: true });
		});

		it("finds valid avatars", async () => {
			const result = await discoverAvatars([testDir]);

			expect(result.length).toBe(2);
			expect(result.map((a) => a.name)).toContain("test-avatar");
			expect(result.map((a) => a.name)).toContain("another-avatar");
		});

		it("returns correct avatar metadata", async () => {
			const result = await discoverAvatars([testDir]);

			const testAvatar = result.find((a) => a.name === "test-avatar");
			expect(testAvatar).toBeDefined();
			expect(testAvatar?.author).toBe("Test Author");
			expect(testAvatar?.version).toBe("1.0.0");
			expect(testAvatar?.path).toBe(join(testDir, "valid-avatar"));
		});

		it("skips directories without manifest", async () => {
			const result = await discoverAvatars([testDir]);

			expect(result.map((a) => a.path)).not.toContain(join(testDir, "no-manifest"));
		});

		it("skips directories with invalid JSON", async () => {
			const result = await discoverAvatars([testDir]);

			expect(result.map((a) => a.path)).not.toContain(join(testDir, "bad-json"));
		});

		it("skips directories with invalid manifest schema", async () => {
			const result = await discoverAvatars([testDir]);

			expect(result.map((a) => a.path)).not.toContain(join(testDir, "invalid-schema"));
		});

		it("handles non-existent paths gracefully", async () => {
			const result = await discoverAvatars(["/nonexistent/path"]);

			expect(result).toEqual([]);
		});

		it("returns results sorted by name", async () => {
			const result = await discoverAvatars([testDir]);

			expect(result[0].name).toBe("another-avatar");
			expect(result[1].name).toBe("test-avatar");
		});

		it("handles multiple search paths", async () => {
			const bundledDir = getBundledAvatarsDir();
			const result = await discoverAvatars([testDir, bundledDir]);

			expect(result.length).toBeGreaterThanOrEqual(3);
			expect(result.map((a) => a.name)).toContain("default");
		});

		it("skips duplicate avatar names (first found wins)", async () => {
			// Create a duplicate in a second test directory
			const testDir2 = join(__dirname, ".test-avatars-2");
			const duplicateDir = join(testDir2, "duplicate");
			await mkdir(duplicateDir, { recursive: true });
			await writeFile(
				join(duplicateDir, "manifest.json"),
				JSON.stringify({
					...validManifest,
					name: "test-avatar", // Same name as existing
					author: "Duplicate Author",
				}),
			);

			try {
				const result = await discoverAvatars([testDir, testDir2]);

				// Should only have one test-avatar
				const testAvatars = result.filter((a) => a.name === "test-avatar");
				expect(testAvatars.length).toBe(1);

				// First found wins (from testDir)
				expect(testAvatars[0].author).toBe("Test Author");
			} finally {
				await rm(testDir2, { recursive: true, force: true });
			}
		});
	});
});
