import { describe, expect, it } from "vitest";
import {
	type AvatarManifest,
	getStateConfig,
	parseManifest,
	validateManifest,
} from "../src/manifest";

const validManifest: AvatarManifest = {
	name: "test-avatar",
	author: "Test Author",
	version: "1.0.0",
	format: "webm",
	states: {
		idle: { file: "idle.webm" },
		thinking: { file: "thinking.webm" },
		writing: { file: "writing.webm" },
		bash: { file: "bash.webm" },
		error: { file: "error.webm" },
		success: { file: "success.webm", duration: 2000, transition_to: "idle" },
		waiting: { file: "waiting.webm" },
	},
};

const minimalValidManifest = {
	name: "minimal-avatar",
	author: "Test",
	version: "1.0.0",
	format: "mp4",
	states: {
		idle: { file: "idle.mp4" },
	},
};

describe("manifest validation", () => {
	describe("parseManifest", () => {
		it("parses valid JSON string", () => {
			const result = parseManifest(JSON.stringify(validManifest));

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.manifest).toBeDefined();
		});

		it("handles invalid JSON string", () => {
			const result = parseManifest("{ invalid json }");

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("Invalid JSON: failed to parse");
		});

		it("accepts object input directly", () => {
			const result = parseManifest(validManifest);

			expect(result.valid).toBe(true);
			expect(result.manifest).toEqual(validManifest);
		});
	});

	describe("validateManifest", () => {
		it("validates a complete manifest", () => {
			const result = validateManifest(validManifest);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});

		it("validates a minimal manifest with warnings", () => {
			const result = validateManifest(minimalValidManifest);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it("rejects non-object input", () => {
			expect(validateManifest(null).errors).toContain("Manifest must be an object");
			expect(validateManifest("string").errors).toContain("Manifest must be an object");
			expect(validateManifest([]).errors).toContain("Manifest must be an object");
		});

		describe("required fields", () => {
			it("requires name field", () => {
				const manifest = { ...validManifest, name: undefined };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining('"name"'));
			});

			it("requires author field", () => {
				const manifest = { ...validManifest, author: undefined };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining('"author"'));
			});

			it("requires version field", () => {
				const manifest = { ...validManifest, version: undefined };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining('"version"'));
			});

			it("requires format field", () => {
				const manifest = { ...validManifest, format: undefined };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining('"format"'));
			});

			it("requires states field", () => {
				const manifest = { ...validManifest, states: undefined };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining('"states"'));
			});
		});

		describe("name validation", () => {
			it("accepts valid kebab-case names", () => {
				const names = ["my-avatar", "a", "avatar-1", "test-avatar-v2"];
				for (const name of names) {
					const manifest = { ...validManifest, name };
					const result = validateManifest(manifest);
					expect(result.errors.filter((e) => e.includes("kebab"))).toHaveLength(0);
				}
			});

			it("rejects non-kebab-case names", () => {
				const names = ["MyAvatar", "my_avatar", "my avatar", "123-avatar", "-avatar"];
				for (const name of names) {
					const manifest = { ...validManifest, name };
					const result = validateManifest(manifest);
					expect(result.errors).toContainEqual(expect.stringContaining("kebab-case"));
				}
			});
		});

		describe("version validation", () => {
			it("warns on invalid semver", () => {
				const manifest = { ...validManifest, version: "v1" };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(true);
				expect(result.warnings).toContainEqual(expect.stringContaining("semver"));
			});

			it("accepts valid semver versions", () => {
				const versions = ["1.0.0", "0.1.0", "10.20.30", "1.0.0-alpha", "1.0.0+build"];
				for (const version of versions) {
					const manifest = { ...validManifest, version };
					const result = validateManifest(manifest);
					expect(result.warnings.filter((w) => w.includes("semver"))).toHaveLength(0);
				}
			});
		});

		describe("states validation", () => {
			it("requires at least one state", () => {
				const manifest = { ...validManifest, states: {} };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining("at least one state"));
			});

			it("requires file property for each state", () => {
				const manifest = {
					...validManifest,
					states: { idle: {} },
				};
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining('"file"'));
			});

			it("validates transition_to references", () => {
				const manifest = {
					...validManifest,
					states: {
						idle: { file: "idle.webm", transition_to: "nonexistent" },
					},
				};
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining("undefined state"));
			});

			it("accepts valid transition_to references", () => {
				const manifest = {
					...validManifest,
					states: {
						idle: { file: "idle.webm" },
						success: { file: "success.webm", transition_to: "idle" },
					},
				};
				const result = validateManifest(manifest);

				expect(result.errors.filter((e) => e.includes("transition_to"))).toHaveLength(0);
			});

			it("validates duration is a number", () => {
				const manifest = {
					...validManifest,
					states: {
						idle: { file: "idle.webm", duration: "1000" },
					},
				};
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining("duration"));
			});
		});

		describe("missing states warnings", () => {
			it("warns about missing required states", () => {
				const result = validateManifest(minimalValidManifest);

				expect(result.warnings).toContainEqual(expect.stringContaining("thinking"));
				expect(result.warnings).toContainEqual(expect.stringContaining("writing"));
				expect(result.warnings).toContainEqual(expect.stringContaining("bash"));
				expect(result.warnings).toContainEqual(expect.stringContaining("error"));
				expect(result.warnings).toContainEqual(expect.stringContaining("success"));
				expect(result.warnings).toContainEqual(expect.stringContaining("waiting"));
			});

			it("does not error on missing states", () => {
				const result = validateManifest(minimalValidManifest);

				expect(result.valid).toBe(true);
			});
		});

		describe("optional fields", () => {
			it("accepts valid optional fields", () => {
				const manifest = {
					...validManifest,
					resolution: "512x512",
					framerate: 24,
					loop: true,
					palette: {
						primary: "#ff0000",
						secondary: "#00ff00",
						background: "#000000",
					},
				};
				const result = validateManifest(manifest);

				expect(result.valid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it("validates resolution type", () => {
				const manifest = { ...validManifest, resolution: 512 };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining("resolution"));
			});

			it("validates framerate type", () => {
				const manifest = { ...validManifest, framerate: "24fps" };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining("framerate"));
			});

			it("validates loop type", () => {
				const manifest = { ...validManifest, loop: "true" };
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining("loop"));
			});

			it("validates palette field types", () => {
				const manifest = {
					...validManifest,
					palette: { primary: 123 },
				};
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors).toContainEqual(expect.stringContaining("palette.primary"));
			});
		});

		describe("custom states", () => {
			it("allows custom states beyond the required ones", () => {
				const manifest = {
					...validManifest,
					states: {
						...validManifest.states,
						dancing: { file: "dancing.webm" },
						sleeping: { file: "sleeping.webm", duration: 5000 },
					},
				};
				const result = validateManifest(manifest);

				expect(result.valid).toBe(true);
				expect(result.manifest?.states.dancing).toBeDefined();
				expect(result.manifest?.states.sleeping).toBeDefined();
			});
		});

		describe("error collection", () => {
			it("collects all errors at once", () => {
				const manifest = {
					name: 123,
					author: null,
					states: {},
				};
				const result = validateManifest(manifest);

				expect(result.valid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(1);
			});
		});
	});

	describe("getStateConfig", () => {
		it("returns exact state match", () => {
			const config = getStateConfig(validManifest, "thinking");

			expect(config).toEqual({ file: "thinking.webm" });
		});

		it("returns state config with all properties", () => {
			const config = getStateConfig(validManifest, "success");

			expect(config).toEqual({
				file: "success.webm",
				duration: 2000,
				transition_to: "idle",
			});
		});

		it("falls back to idle for unknown state", () => {
			const config = getStateConfig(validManifest, "unknown");

			expect(config).toEqual({ file: "idle.webm" });
		});

		it("returns null when state not found and no idle", () => {
			const manifestWithoutIdle: AvatarManifest = {
				...validManifest,
				states: {
					thinking: { file: "thinking.webm" },
				},
			};
			const config = getStateConfig(manifestWithoutIdle, "unknown");

			expect(config).toBeNull();
		});

		it("handles custom states", () => {
			const manifestWithCustom: AvatarManifest = {
				...validManifest,
				states: {
					...validManifest.states,
					dancing: { file: "dancing.webm" },
				},
			};
			const config = getStateConfig(manifestWithCustom, "dancing");

			expect(config).toEqual({ file: "dancing.webm" });
		});
	});
});
