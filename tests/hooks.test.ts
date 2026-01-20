import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	type ClaudeSettings,
	countBytesideHooks,
	createBackup,
	generateHookConfig,
	getGlobalClaudeSettingsPath,
	getHookStatus,
	getProjectClaudeSettingsPath,
	hasBytesideHooks,
	installHooks,
	isBytesideHook,
	mergeHooks,
	readClaudeSettings,
	removeBytesideHooks,
	uninstallHooks,
	writeClaudeSettings,
} from "../src/hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testDir = join(__dirname, ".test-hooks");

describe("hooks", () => {
	beforeAll(async () => {
		await mkdir(testDir, { recursive: true });
	});

	afterAll(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("path helpers", () => {
		it("getGlobalClaudeSettingsPath returns correct path", () => {
			const path = getGlobalClaudeSettingsPath();
			expect(path).toBe(join(homedir(), ".claude", "settings.json"));
		});

		it("getProjectClaudeSettingsPath returns correct path", () => {
			const path = getProjectClaudeSettingsPath();
			expect(path).toBe(join(process.cwd(), ".claude", "settings.json"));
		});
	});

	describe("isBytesideHook", () => {
		it("returns true for byteside trigger commands", () => {
			expect(isBytesideHook("byteside trigger thinking")).toBe(true);
			expect(isBytesideHook("byteside trigger idle")).toBe(true);
			expect(isBytesideHook("byteside trigger writing")).toBe(true);
		});

		it("returns false for other commands", () => {
			expect(isBytesideHook("echo hello")).toBe(false);
			expect(isBytesideHook("curl http://localhost:3333")).toBe(false);
			expect(isBytesideHook("npm test")).toBe(false);
		});
	});

	describe("generateHookConfig", () => {
		it("generates correct hook structure", () => {
			const hooks = generateHookConfig();

			expect(hooks.UserPromptSubmit).toBeDefined();
			expect(hooks.PreToolUse).toBeDefined();
			expect(hooks.PostToolUse).toBeDefined();
			expect(hooks.Notification).toBeDefined();
			expect(hooks.Stop).toBeDefined();
		});

		it("generates UserPromptSubmit hook for thinking state", () => {
			const hooks = generateHookConfig();

			expect(hooks.UserPromptSubmit).toHaveLength(1);
			expect(hooks.UserPromptSubmit?.[0].hooks[0].command).toBe("byteside trigger thinking");
		});

		it("generates PreToolUse hooks for writing tools", () => {
			const hooks = generateHookConfig();
			const writingHook = hooks.PreToolUse?.find(
				(h) => h.hooks[0].command === "byteside trigger writing",
			);

			expect(writingHook).toBeDefined();
			expect(writingHook?.matcher).toContain("Edit");
			expect(writingHook?.matcher).toContain("Write");
		});

		it("generates PreToolUse hooks for bash", () => {
			const hooks = generateHookConfig();
			const bashHook = hooks.PreToolUse?.find(
				(h) => h.hooks[0].command === "byteside trigger bash",
			);

			expect(bashHook).toBeDefined();
			expect(bashHook?.matcher).toBe("Bash");
		});

		it("generates PostToolUse hook to return to thinking", () => {
			const hooks = generateHookConfig();

			expect(hooks.PostToolUse).toHaveLength(1);
			expect(hooks.PostToolUse?.[0].matcher).toBe("*");
			expect(hooks.PostToolUse?.[0].hooks[0].command).toBe("byteside trigger thinking");
		});

		it("generates Notification hook for waiting state", () => {
			const hooks = generateHookConfig();

			expect(hooks.Notification).toHaveLength(1);
			expect(hooks.Notification?.[0].hooks[0].command).toBe("byteside trigger waiting");
		});

		it("generates Stop hook for success state", () => {
			const hooks = generateHookConfig();

			expect(hooks.Stop).toHaveLength(1);
			expect(hooks.Stop?.[0].hooks[0].command).toBe("byteside trigger success");
		});
	});

	describe("readClaudeSettings / writeClaudeSettings", () => {
		const settingsPath = join(testDir, "read-write-test", "settings.json");

		beforeEach(async () => {
			await rm(dirname(settingsPath), { recursive: true, force: true });
		});

		it("returns null for non-existent file", async () => {
			const result = await readClaudeSettings(settingsPath);
			expect(result).toBeNull();
		});

		it("reads existing settings", async () => {
			await mkdir(dirname(settingsPath), { recursive: true });
			const settings: ClaudeSettings = { hooks: { PreToolUse: [] }, customKey: "value" };
			await writeFile(settingsPath, JSON.stringify(settings));

			const result = await readClaudeSettings(settingsPath);
			expect(result).toEqual(settings);
		});

		it("writes settings and creates directory", async () => {
			const settings: ClaudeSettings = { hooks: { PreToolUse: [] } };

			await writeClaudeSettings(settingsPath, settings);

			const content = await readFile(settingsPath, "utf-8");
			expect(JSON.parse(content)).toEqual(settings);
		});

		it("throws on invalid JSON", async () => {
			await mkdir(dirname(settingsPath), { recursive: true });
			await writeFile(settingsPath, "{ invalid }");

			await expect(readClaudeSettings(settingsPath)).rejects.toThrow();
		});
	});

	describe("createBackup", () => {
		const settingsPath = join(testDir, "backup-test", "settings.json");

		beforeEach(async () => {
			await rm(dirname(settingsPath), { recursive: true, force: true });
		});

		it("returns null for non-existent file", async () => {
			const result = await createBackup(settingsPath);
			expect(result).toBeNull();
		});

		it("creates backup of existing file", async () => {
			await mkdir(dirname(settingsPath), { recursive: true });
			const content = JSON.stringify({ test: true });
			await writeFile(settingsPath, content);

			const backupPath = await createBackup(settingsPath);

			expect(backupPath).not.toBeNull();
			expect(backupPath).toContain(".backup-");
			if (backupPath) {
				const backupContent = await readFile(backupPath, "utf-8");
				expect(backupContent).toBe(content);
			}
		});
	});

	describe("removeBytesideHooks", () => {
		it("removes byteside hooks from PreToolUse", () => {
			const settings: ClaudeSettings = {
				hooks: {
					PreToolUse: [
						{ matcher: "Read", hooks: [{ type: "command", command: "byteside trigger thinking" }] },
						{ matcher: "Custom", hooks: [{ type: "command", command: "echo custom" }] },
					],
				},
			};

			const result = removeBytesideHooks(settings);

			expect(result.hooks?.PreToolUse).toHaveLength(1);
			expect(result.hooks?.PreToolUse?.[0].matcher).toBe("Custom");
		});

		it("preserves non-byteside hooks", () => {
			const settings: ClaudeSettings = {
				hooks: {
					PreToolUse: [{ matcher: "Custom", hooks: [{ type: "command", command: "echo custom" }] }],
				},
				customKey: "preserved",
			};

			const result = removeBytesideHooks(settings);

			expect(result.hooks?.PreToolUse).toHaveLength(1);
			expect(result.customKey).toBe("preserved");
		});

		it("removes empty hooks object", () => {
			const settings: ClaudeSettings = {
				hooks: {
					PreToolUse: [
						{ matcher: "Read", hooks: [{ type: "command", command: "byteside trigger thinking" }] },
					],
				},
			};

			const result = removeBytesideHooks(settings);

			expect(result.hooks).toBeUndefined();
		});

		it("handles settings without hooks", () => {
			const settings: ClaudeSettings = { customKey: "value" };

			const result = removeBytesideHooks(settings);

			expect(result).toEqual(settings);
		});
	});

	describe("mergeHooks", () => {
		it("merges byteside hooks into empty settings", () => {
			const bytesideHooks = generateHookConfig();

			const result = mergeHooks(null, bytesideHooks);

			expect(result.hooks?.UserPromptSubmit).toHaveLength(1);
			expect(result.hooks?.PreToolUse).toHaveLength(2);
			expect(result.hooks?.PostToolUse).toHaveLength(1);
			expect(result.hooks?.Notification).toHaveLength(1);
			expect(result.hooks?.Stop).toHaveLength(1);
		});

		it("preserves existing non-byteside hooks", () => {
			const existing: ClaudeSettings = {
				hooks: {
					PreToolUse: [{ matcher: "Custom", hooks: [{ type: "command", command: "echo custom" }] }],
				},
			};
			const bytesideHooks = generateHookConfig();

			const result = mergeHooks(existing, bytesideHooks);

			// Should have custom hook + 2 byteside hooks
			expect(result.hooks?.PreToolUse).toHaveLength(3);
			expect(result.hooks?.PreToolUse?.[0].matcher).toBe("Custom");
		});

		it("preserves other settings", () => {
			const existing: ClaudeSettings = {
				customKey: "value",
				anotherKey: 123,
			};
			const bytesideHooks = generateHookConfig();

			const result = mergeHooks(existing, bytesideHooks);

			expect(result.customKey).toBe("value");
			expect(result.anotherKey).toBe(123);
		});

		it("replaces existing byteside hooks", () => {
			const existing: ClaudeSettings = {
				hooks: {
					PreToolUse: [
						{ matcher: "Read", hooks: [{ type: "command", command: "byteside trigger thinking" }] },
						{ matcher: "Custom", hooks: [{ type: "command", command: "echo custom" }] },
					],
				},
			};
			const bytesideHooks = generateHookConfig();

			const result = mergeHooks(existing, bytesideHooks);

			// Should have custom hook + 2 new byteside hooks (old one removed)
			expect(result.hooks?.PreToolUse).toHaveLength(3);
		});
	});

	describe("countBytesideHooks / hasBytesideHooks", () => {
		it("counts byteside hooks correctly", () => {
			const settings: ClaudeSettings = {
				hooks: generateHookConfig(),
			};

			const count = countBytesideHooks(settings);

			// 3 PreToolUse + 1 PostToolUse + 1 Notification + 1 Stop = 6
			expect(count).toBe(6);
		});

		it("returns 0 for null settings", () => {
			expect(countBytesideHooks(null)).toBe(0);
		});

		it("returns 0 for settings without hooks", () => {
			expect(countBytesideHooks({})).toBe(0);
		});

		it("hasBytesideHooks returns true when hooks exist", () => {
			const settings: ClaudeSettings = {
				hooks: generateHookConfig(),
			};

			expect(hasBytesideHooks(settings)).toBe(true);
		});

		it("hasBytesideHooks returns false when no byteside hooks", () => {
			const settings: ClaudeSettings = {
				hooks: {
					PreToolUse: [{ matcher: "Custom", hooks: [{ type: "command", command: "echo custom" }] }],
				},
			};

			expect(hasBytesideHooks(settings)).toBe(false);
		});
	});

	describe("installHooks", () => {
		const installPath = join(testDir, "install-test", ".claude", "settings.json");

		beforeEach(async () => {
			await rm(join(testDir, "install-test"), { recursive: true, force: true });
		});

		it("installs hooks to new file", async () => {
			const result = await installHooks(installPath);

			expect(result.success).toBe(true);
			expect(result.message).toContain("Installed");

			const settings = await readClaudeSettings(installPath);
			expect(countBytesideHooks(settings)).toBe(6);
		});

		it("fails if hooks already exist without force", async () => {
			await installHooks(installPath);

			const result = await installHooks(installPath);

			expect(result.success).toBe(false);
			expect(result.message).toContain("already installed");
		});

		it("overwrites with force option", async () => {
			await installHooks(installPath);

			const result = await installHooks(installPath, { force: true });

			expect(result.success).toBe(true);
		});

		it("creates backup by default", async () => {
			// First install
			await installHooks(installPath);

			// Second install with force
			const result = await installHooks(installPath, { force: true });

			expect(result.success).toBe(true);
			expect(result.backupPath).toBeDefined();
		});

		it("skips backup with noBackup option", async () => {
			await installHooks(installPath);

			const result = await installHooks(installPath, { force: true, noBackup: true });

			expect(result.success).toBe(true);
			expect(result.backupPath).toBeUndefined();
		});

		it("fails on invalid JSON", async () => {
			await mkdir(dirname(installPath), { recursive: true });
			await writeFile(installPath, "{ invalid }");

			const result = await installHooks(installPath);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Invalid JSON");
		});
	});

	describe("uninstallHooks", () => {
		const uninstallPath = join(testDir, "uninstall-test", ".claude", "settings.json");

		beforeEach(async () => {
			await rm(join(testDir, "uninstall-test"), { recursive: true, force: true });
		});

		it("removes byteside hooks", async () => {
			await installHooks(uninstallPath);

			const result = await uninstallHooks(uninstallPath);

			expect(result.success).toBe(true);
			expect(result.message).toContain("Removed");

			const settings = await readClaudeSettings(uninstallPath);
			expect(countBytesideHooks(settings)).toBe(0);
		});

		it("preserves non-byteside hooks", async () => {
			await mkdir(dirname(uninstallPath), { recursive: true });
			const settings: ClaudeSettings = {
				hooks: {
					...generateHookConfig(),
					PreToolUse: [
						...(generateHookConfig().PreToolUse ?? []),
						{ matcher: "Custom", hooks: [{ type: "command", command: "echo custom" }] },
					],
				},
			};
			await writeClaudeSettings(uninstallPath, settings);

			const result = await uninstallHooks(uninstallPath);

			expect(result.success).toBe(true);

			const after = await readClaudeSettings(uninstallPath);
			expect(after?.hooks?.PreToolUse).toHaveLength(1);
			expect(after?.hooks?.PreToolUse?.[0].matcher).toBe("Custom");
		});

		it("succeeds if file does not exist", async () => {
			const result = await uninstallHooks(uninstallPath);

			expect(result.success).toBe(true);
			expect(result.message).toContain("No settings file");
		});

		it("succeeds if no byteside hooks found", async () => {
			await mkdir(dirname(uninstallPath), { recursive: true });
			await writeClaudeSettings(uninstallPath, {});

			const result = await uninstallHooks(uninstallPath);

			expect(result.success).toBe(true);
			expect(result.message).toContain("No byteside hooks");
		});

		it("creates backup by default", async () => {
			await installHooks(uninstallPath);

			const result = await uninstallHooks(uninstallPath);

			expect(result.success).toBe(true);
			expect(result.backupPath).toBeDefined();
		});
	});

	describe("getHookStatus", () => {
		const statusPath = join(testDir, "status-test", ".claude", "settings.json");

		beforeEach(async () => {
			await rm(join(testDir, "status-test"), { recursive: true, force: true });
		});

		it("returns not installed for non-existent file", async () => {
			const status = await getHookStatus(statusPath);

			expect(status.installed).toBe(false);
			expect(status.hookCount).toBe(0);
			expect(status.exists).toBe(false);
			expect(status.path).toBe(statusPath);
		});

		it("returns installed status for file with hooks", async () => {
			await installHooks(statusPath);

			const status = await getHookStatus(statusPath);

			expect(status.installed).toBe(true);
			expect(status.hookCount).toBe(6);
			expect(status.exists).toBe(true);
		});

		it("returns not installed for file without byteside hooks", async () => {
			await mkdir(dirname(statusPath), { recursive: true });
			await writeClaudeSettings(statusPath, {
				hooks: {
					PreToolUse: [{ matcher: "Custom", hooks: [{ type: "command", command: "echo custom" }] }],
				},
			});

			const status = await getHookStatus(statusPath);

			expect(status.installed).toBe(false);
			expect(status.hookCount).toBe(0);
			expect(status.exists).toBe(true);
		});
	});
});
