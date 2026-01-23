import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarManifest } from "../src/manifest";
import { REQUIRED_STATES } from "../src/types";

// Mock external dependencies
vi.mock("commander", () => ({
	program: {
		name: vi.fn().mockReturnThis(),
		description: vi.fn().mockReturnThis(),
		version: vi.fn().mockReturnThis(),
		hook: vi.fn().mockReturnThis(),
		option: vi.fn().mockReturnThis(),
		action: vi.fn().mockReturnThis(),
		command: vi.fn().mockReturnThis(),
		parseAsync: vi.fn().mockResolvedValue(undefined),
	},
}));

vi.mock("open", () => ({
	default: vi.fn(),
}));

vi.mock("picocolors", () => ({
	default: {
		bold: (s: string) => s,
		dim: (s: string) => s,
		cyan: (s: string) => s,
		green: (s: string) => s,
		yellow: (s: string) => s,
		red: (s: string) => s,
	},
}));

// Mock config
vi.mock("../src/config.js", () => ({
	loadBytesideConfig: vi.fn().mockResolvedValue({
		server: { port: 3333 },
		avatar: "default",
		avatarPaths: ["~/.byteside/avatars"],
	}),
	ensureGlobalConfig: vi.fn().mockResolvedValue(undefined),
}));

// Mock avatar functions
vi.mock("../src/avatar.js", () => ({
	discoverAvatars: vi.fn(),
	ensureUserAvatars: vi.fn().mockResolvedValue(undefined),
	resolveAvatarPath: vi.fn(),
}));

// Mock manifest validation
vi.mock("../src/manifest.js", () => ({
	validateAvatar: vi.fn(),
}));

// Mock hooks
vi.mock("../src/hooks.js", () => ({
	generateHookConfig: vi.fn().mockReturnValue({
		UserPromptSubmit: [{ hooks: [{ type: "command", command: "byteside trigger thinking" }] }],
	}),
	getGlobalClaudeSettingsPath: vi.fn().mockReturnValue("/home/user/.claude/settings.json"),
	getProjectClaudeSettingsPath: vi.fn().mockReturnValue("/project/.claude/settings.json"),
	getHookStatus: vi.fn(),
	installHooks: vi.fn(),
	uninstallHooks: vi.fn(),
}));

// Mock terminal
vi.mock("../src/terminal/index.js", () => ({
	createTerminalRenderer: vi.fn(),
	isTerminalCapable: vi.fn().mockReturnValue(false),
}));

// Import modules after mocking
import { discoverAvatars } from "../src/avatar.js";
import { generateHookConfig, getHookStatus } from "../src/hooks.js";
import { validateAvatar } from "../src/manifest.js";

describe("CLI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("list command", () => {
		it("returns discovered avatars", async () => {
			const mockAvatars: Pick<AvatarManifest, "name" | "author" | "version">[] = [
				{ name: "default", author: "byteside", version: "1.0.0" },
				{ name: "custom", author: "user", version: "0.1.0" },
			];

			vi.mocked(discoverAvatars).mockResolvedValue(mockAvatars as AvatarManifest[]);

			const avatars = await discoverAvatars(["~/.byteside/avatars"]);

			expect(avatars).toHaveLength(2);
			expect(avatars[0].name).toBe("default");
			expect(avatars[1].name).toBe("custom");
		});

		it("returns empty array when no avatars found", async () => {
			vi.mocked(discoverAvatars).mockResolvedValue([]);

			const avatars = await discoverAvatars(["~/.byteside/avatars"]);

			expect(avatars).toHaveLength(0);
		});
	});

	describe("validate command", () => {
		it("returns valid result for valid avatar", async () => {
			const mockManifest: AvatarManifest = {
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
					success: { file: "success.webm" },
					waiting: { file: "waiting.webm" },
				},
			};

			vi.mocked(validateAvatar).mockResolvedValue({
				valid: true,
				errors: [],
				warnings: [],
				manifest: mockManifest,
				missingFiles: [],
			});

			const result = await validateAvatar("/path/to/avatar");

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.manifest?.name).toBe("test-avatar");
		});

		it("returns errors for invalid avatar", async () => {
			vi.mocked(validateAvatar).mockResolvedValue({
				valid: false,
				errors: ["manifest.json not found"],
				warnings: [],
				missingFiles: [],
			});

			const result = await validateAvatar("/path/to/invalid");

			expect(result.valid).toBe(false);
			expect(result.errors).toContain("manifest.json not found");
		});

		it("returns warnings for avatars missing optional states", async () => {
			vi.mocked(validateAvatar).mockResolvedValue({
				valid: true,
				errors: [],
				warnings: ['Missing recommended state: "waiting"'],
				manifest: {
					name: "partial",
					author: "Test",
					version: "1.0.0",
					format: "webm",
					states: { idle: { file: "idle.webm" } },
				},
				missingFiles: [],
			});

			const result = await validateAvatar("/path/to/partial");

			expect(result.valid).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
		});
	});

	describe("trigger command", () => {
		it("validates state is in REQUIRED_STATES", () => {
			expect(REQUIRED_STATES).toContain("idle");
			expect(REQUIRED_STATES).toContain("thinking");
			expect(REQUIRED_STATES).toContain("writing");
			expect(REQUIRED_STATES).toContain("bash");
			expect(REQUIRED_STATES).toContain("error");
			expect(REQUIRED_STATES).toContain("success");
			expect(REQUIRED_STATES).toContain("waiting");
		});

		it("rejects invalid states", () => {
			expect(REQUIRED_STATES).not.toContain("invalid");
			expect(REQUIRED_STATES).not.toContain("sleeping");
		});
	});

	describe("hooks status command", () => {
		it("returns status when hooks are installed", async () => {
			vi.mocked(getHookStatus).mockResolvedValue({
				installed: true,
				hookCount: 5,
				path: "/project/.claude/settings.json",
				exists: true,
			});

			const status = await getHookStatus("/project/.claude/settings.json");

			expect(status.installed).toBe(true);
			expect(status.hookCount).toBe(5);
			expect(status.exists).toBe(true);
		});

		it("returns status when no hooks installed", async () => {
			vi.mocked(getHookStatus).mockResolvedValue({
				installed: false,
				hookCount: 0,
				path: "/project/.claude/settings.json",
				exists: true,
			});

			const status = await getHookStatus("/project/.claude/settings.json");

			expect(status.installed).toBe(false);
			expect(status.hookCount).toBe(0);
		});

		it("returns status when settings file does not exist", async () => {
			vi.mocked(getHookStatus).mockResolvedValue({
				installed: false,
				hookCount: 0,
				path: "/project/.claude/settings.json",
				exists: false,
			});

			const status = await getHookStatus("/project/.claude/settings.json");

			expect(status.exists).toBe(false);
			expect(status.installed).toBe(false);
		});
	});

	describe("hooks show command", () => {
		it("generates hook configuration", () => {
			const hooks = generateHookConfig();

			expect(hooks).toHaveProperty("UserPromptSubmit");
			expect(hooks.UserPromptSubmit).toBeInstanceOf(Array);
			expect(hooks.UserPromptSubmit?.[0]?.hooks?.[0]?.command).toBe("byteside trigger thinking");
		});
	});
});
