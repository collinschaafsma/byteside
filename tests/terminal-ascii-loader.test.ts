import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TerminalConfig, TerminalStateConfig } from "../src/manifest";
import { clearFrameCache, loadStateFrames, preloadAllFrames } from "../src/terminal/ascii-loader";

const fixturesDir = join(__dirname, "fixtures", "terminal");

describe("ASCII frame loader", () => {
	afterEach(() => {
		clearFrameCache();
	});

	describe("loadStateFrames()", () => {
		describe("ASCII mode", () => {
			it("loads single ASCII frame", async () => {
				const stateConfig: TerminalStateConfig = {
					frames: ["idle/01.txt"],
				};

				const result = await loadStateFrames(stateConfig, fixturesDir, "ascii");

				expect(result.isImage).toBe(false);
				expect(result.frames).toHaveLength(1);
				expect(result.frames[0]).toContain("Idle 1");
			});

			it("loads multiple ASCII frames", async () => {
				const stateConfig: TerminalStateConfig = {
					frames: ["idle/01.txt", "idle/02.txt"],
				};

				const result = await loadStateFrames(stateConfig, fixturesDir, "ascii");

				expect(result.isImage).toBe(false);
				expect(result.frames).toHaveLength(2);
				expect(result.frames[0]).toContain("Idle 1");
				expect(result.frames[1]).toContain("Idle 2");
			});

			it("preserves frame order", async () => {
				const stateConfig: TerminalStateConfig = {
					frames: ["idle/02.txt", "idle/01.txt"],
				};

				const result = await loadStateFrames(stateConfig, fixturesDir, "ascii");

				expect(result.frames[0]).toContain("Idle 2");
				expect(result.frames[1]).toContain("Idle 1");
			});

			it("returns empty frame when no frames configured", async () => {
				const stateConfig: TerminalStateConfig = {};

				const result = await loadStateFrames(stateConfig, fixturesDir, "ascii");

				expect(result.isImage).toBe(false);
				expect(result.frames).toHaveLength(1);
				expect(result.frames[0]).toBe("");
			});
		});

		describe("image mode", () => {
			it("returns image path for image mode", async () => {
				const stateConfig: TerminalStateConfig = {
					image: "idle/image.png",
				};

				const result = await loadStateFrames(stateConfig, fixturesDir, "image");

				expect(result.isImage).toBe(true);
				expect(result.frames).toHaveLength(1);
				expect(result.frames[0]).toBe(join(fixturesDir, "idle/image.png"));
			});

			it("returns empty frame when no image configured", async () => {
				const stateConfig: TerminalStateConfig = {};

				const result = await loadStateFrames(stateConfig, fixturesDir, "image");

				expect(result.isImage).toBe(false);
				expect(result.frames).toHaveLength(1);
				expect(result.frames[0]).toBe("");
			});

			it("ignores frames array in image mode", async () => {
				const stateConfig: TerminalStateConfig = {
					frames: ["idle/01.txt"],
					image: "idle/image.png",
				};

				const result = await loadStateFrames(stateConfig, fixturesDir, "image");

				expect(result.isImage).toBe(true);
				expect(result.frames[0]).toContain("idle/image.png");
			});
		});
	});

	describe("preloadAllFrames()", () => {
		it("preloads frames for all states", async () => {
			const terminalConfig: TerminalConfig = {
				enabled: true,
				mode: "ascii",
				states: {
					idle: { frames: ["idle/01.txt", "idle/02.txt"] },
					thinking: { frames: ["thinking/01.txt"] },
				},
			};

			const result = await preloadAllFrames(terminalConfig, fixturesDir);

			expect(result.size).toBe(2);
			expect(result.has("idle")).toBe(true);
			expect(result.has("thinking")).toBe(true);

			const idleFrames = result.get("idle");
			expect(idleFrames?.frames).toHaveLength(2);
			expect(idleFrames?.isImage).toBe(false);

			const thinkingFrames = result.get("thinking");
			expect(thinkingFrames?.frames).toHaveLength(1);
		});

		it("returns empty map when no states", async () => {
			const terminalConfig: TerminalConfig = {
				enabled: true,
				mode: "ascii",
				states: {},
			};

			const result = await preloadAllFrames(terminalConfig, fixturesDir);

			expect(result.size).toBe(0);
		});
	});

	describe("clearFrameCache()", () => {
		it("clears cached frames", async () => {
			const stateConfig: TerminalStateConfig = {
				frames: ["idle/01.txt"],
			};

			// Load frames to populate cache
			await loadStateFrames(stateConfig, fixturesDir, "ascii");

			// Clear cache
			clearFrameCache();

			// Load again - should still work (cache is just cleared, not corrupted)
			const result = await loadStateFrames(stateConfig, fixturesDir, "ascii");
			expect(result.frames).toHaveLength(1);
			expect(result.frames[0]).toContain("Idle 1");
		});
	});

	describe("caching behavior", () => {
		it("caches frames across multiple loads", async () => {
			const stateConfig: TerminalStateConfig = {
				frames: ["idle/01.txt"],
			};

			// First load
			const result1 = await loadStateFrames(stateConfig, fixturesDir, "ascii");

			// Second load - should use cache
			const result2 = await loadStateFrames(stateConfig, fixturesDir, "ascii");

			// Should return same content
			expect(result1.frames[0]).toBe(result2.frames[0]);
		});
	});
});
