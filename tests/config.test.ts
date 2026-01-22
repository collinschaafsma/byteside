import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { defaults, loadBytesideConfig } from "../src/config";

// Use a test-specific config directory to avoid affecting real config
const testConfigDir = join(homedir(), ".byteside-test");
const testConfigPath = join(testConfigDir, "config.json");
const realConfigDir = join(homedir(), ".byteside");
const realConfigPath = join(realConfigDir, "config.json");

describe("config module", () => {
	let originalConfig: string | null = null;

	beforeAll(async () => {
		// Backup existing config if present
		if (existsSync(realConfigPath)) {
			originalConfig = await readFile(realConfigPath, "utf-8");
		}
	});

	afterAll(async () => {
		// Restore original config
		if (originalConfig !== null) {
			await writeFile(realConfigPath, originalConfig);
		}
		// Clean up test directory
		if (existsSync(testConfigDir)) {
			await rm(testConfigDir, { recursive: true, force: true });
		}
	});

	afterEach(async () => {
		// Restore original config after each test
		if (originalConfig !== null) {
			await writeFile(realConfigPath, originalConfig);
		}
	});

	describe("loadBytesideConfig", () => {
		it("returns defaults when no config file exists", async () => {
			// Temporarily remove config
			if (existsSync(realConfigPath)) {
				await rm(realConfigPath);
			}

			const config = await loadBytesideConfig();

			expect(config.avatar).toBe(defaults.avatar);
			expect(config.server?.port).toBe(defaults.server?.port);
			expect(config.avatarPaths).toEqual(defaults.avatarPaths);
		});

		it("loads avatar from global config file", async () => {
			// Ensure directory exists
			await mkdir(realConfigDir, { recursive: true });

			// Write test config
			await writeFile(realConfigPath, JSON.stringify({ avatar: "custom-avatar" }));

			const config = await loadBytesideConfig();

			expect(config.avatar).toBe("custom-avatar");
		});

		it("loads multiple settings from global config", async () => {
			await mkdir(realConfigDir, { recursive: true });

			const testConfig = {
				avatar: "my-avatar",
				server: { port: 4444 },
				viewer: { autoOpen: false },
			};
			await writeFile(realConfigPath, JSON.stringify(testConfig));

			const config = await loadBytesideConfig();

			expect(config.avatar).toBe("my-avatar");
			expect(config.server?.port).toBe(4444);
			expect(config.viewer?.autoOpen).toBe(false);
		});

		it("merges global config with defaults", async () => {
			await mkdir(realConfigDir, { recursive: true });

			// Only override avatar, other settings should come from defaults
			await writeFile(realConfigPath, JSON.stringify({ avatar: "partial-config" }));

			const config = await loadBytesideConfig();

			expect(config.avatar).toBe("partial-config");
			expect(config.server?.port).toBe(defaults.server?.port);
			expect(config.avatarPaths).toEqual(defaults.avatarPaths);
		});

		it("handles invalid JSON gracefully", async () => {
			await mkdir(realConfigDir, { recursive: true });

			await writeFile(realConfigPath, "{ invalid json }");

			const config = await loadBytesideConfig();

			// Should fall back to defaults
			expect(config.avatar).toBe(defaults.avatar);
		});

		it("loads custom avatarPaths from config", async () => {
			await mkdir(realConfigDir, { recursive: true });

			const customPaths = ["~/custom/avatars", "./local/avatars"];
			await writeFile(realConfigPath, JSON.stringify({ avatarPaths: customPaths }));

			const config = await loadBytesideConfig();

			expect(config.avatarPaths).toEqual(customPaths);
		});
	});

	describe("defaults", () => {
		it("has expected default values", () => {
			expect(defaults.avatar).toBe("default");
			expect(defaults.server?.port).toBe(3333);
			expect(defaults.server?.host).toBe("localhost");
			expect(defaults.viewer?.autoOpen).toBe(true);
			expect(defaults.avatarPaths).toContain("~/.byteside/avatars");
		});
	});
});
