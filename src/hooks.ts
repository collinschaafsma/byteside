import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Single hook command configuration.
 */
export interface HookCommand {
	type: "command";
	command: string;
}

/**
 * Hook configuration with optional matcher.
 */
export interface HookEntry {
	matcher?: string;
	hooks: HookCommand[];
}

/**
 * Claude hooks configuration structure.
 */
export interface ClaudeHooks {
	UserPromptSubmit?: HookEntry[];
	PreToolUse?: HookEntry[];
	PostToolUse?: HookEntry[];
	Notification?: HookEntry[];
	Stop?: HookEntry[];
}

/**
 * Claude settings.json structure.
 */
export interface ClaudeSettings {
	hooks?: ClaudeHooks;
	[key: string]: unknown;
}

/**
 * Result of a hook operation.
 */
export interface HookResult {
	success: boolean;
	message: string;
	backupPath?: string;
}

/**
 * Status of hooks installation.
 */
export interface HookStatus {
	installed: boolean;
	hookCount: number;
	path: string;
	exists: boolean;
}

/**
 * Options for installing hooks.
 */
export interface InstallOptions {
	force?: boolean;
	noBackup?: boolean;
}

/**
 * Tool matchers for each avatar state.
 */
const WRITING_TOOLS = "Edit|Write|MultiEdit|NotebookEdit";
const BASH_TOOLS = "Bash";

/**
 * Get the global Claude settings path.
 */
export function getGlobalClaudeSettingsPath(): string {
	return join(homedir(), ".claude", "settings.json");
}

/**
 * Get the project-level Claude settings path.
 */
export function getProjectClaudeSettingsPath(): string {
	return join(process.cwd(), ".claude", "settings.json");
}

/**
 * Check if a hook command is a byteside hook.
 */
export function isBytesideHook(command: string): boolean {
	return command.startsWith("byteside trigger");
}

/**
 * Generate the byteside hook configuration.
 */
export function generateHookConfig(): ClaudeHooks {
	return {
		UserPromptSubmit: [
			{
				hooks: [{ type: "command", command: "byteside trigger thinking" }],
			},
		],
		PreToolUse: [
			{
				matcher: WRITING_TOOLS,
				hooks: [{ type: "command", command: "byteside trigger writing" }],
			},
			{
				matcher: BASH_TOOLS,
				hooks: [{ type: "command", command: "byteside trigger bash" }],
			},
		],
		PostToolUse: [
			{
				matcher: "*",
				hooks: [{ type: "command", command: "byteside trigger thinking" }],
			},
		],
		Notification: [
			{
				hooks: [{ type: "command", command: "byteside trigger waiting" }],
			},
		],
		Stop: [
			{
				hooks: [{ type: "command", command: "byteside trigger success" }],
			},
		],
	};
}

/**
 * Read Claude settings from a path.
 * Returns null if file doesn't exist.
 */
export async function readClaudeSettings(path: string): Promise<ClaudeSettings | null> {
	if (!existsSync(path)) {
		return null;
	}

	const content = await readFile(path, "utf-8");
	return JSON.parse(content) as ClaudeSettings;
}

/**
 * Write Claude settings to a path.
 * Creates directory if it doesn't exist.
 */
export async function writeClaudeSettings(path: string, settings: ClaudeSettings): Promise<void> {
	const dir = dirname(path);
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
	await writeFile(path, JSON.stringify(settings, null, "\t"));
}

/**
 * Create a backup of the settings file.
 * Returns the backup path or null if file doesn't exist.
 */
export async function createBackup(path: string): Promise<string | null> {
	if (!existsSync(path)) {
		return null;
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupPath = path.replace(".json", `.backup-${timestamp}.json`);
	await copyFile(path, backupPath);
	return backupPath;
}

/**
 * Filter out byteside hooks from an array of hook entries.
 */
function filterBytesideHooks(entries: HookEntry[]): HookEntry[] {
	return entries.filter((entry) => {
		// Keep entries that have at least one non-byteside hook
		const nonBytesideHooks = entry.hooks.filter((h) => !isBytesideHook(h.command));
		if (nonBytesideHooks.length === 0) {
			return false;
		}
		// Update entry to only have non-byteside hooks
		entry.hooks = nonBytesideHooks;
		return true;
	});
}

/**
 * Remove byteside hooks from settings.
 */
export function removeBytesideHooks(settings: ClaudeSettings): ClaudeSettings {
	if (!settings.hooks) {
		return settings;
	}

	const newHooks: ClaudeHooks = {};

	if (settings.hooks.UserPromptSubmit) {
		const filtered = filterBytesideHooks([...settings.hooks.UserPromptSubmit]);
		if (filtered.length > 0) {
			newHooks.UserPromptSubmit = filtered;
		}
	}

	if (settings.hooks.PreToolUse) {
		const filtered = filterBytesideHooks([...settings.hooks.PreToolUse]);
		if (filtered.length > 0) {
			newHooks.PreToolUse = filtered;
		}
	}

	if (settings.hooks.PostToolUse) {
		const filtered = filterBytesideHooks([...settings.hooks.PostToolUse]);
		if (filtered.length > 0) {
			newHooks.PostToolUse = filtered;
		}
	}

	if (settings.hooks.Notification) {
		const filtered = filterBytesideHooks([...settings.hooks.Notification]);
		if (filtered.length > 0) {
			newHooks.Notification = filtered;
		}
	}

	if (settings.hooks.Stop) {
		const filtered = filterBytesideHooks([...settings.hooks.Stop]);
		if (filtered.length > 0) {
			newHooks.Stop = filtered;
		}
	}

	return {
		...settings,
		hooks: Object.keys(newHooks).length > 0 ? newHooks : undefined,
	};
}

/**
 * Merge byteside hooks with existing settings.
 * Preserves non-byteside hooks.
 */
export function mergeHooks(
	existing: ClaudeSettings | null,
	bytesideHooks: ClaudeHooks,
): ClaudeSettings {
	// Start with existing settings or empty object
	const base = existing ? removeBytesideHooks(existing) : {};

	// Merge hooks
	const mergedHooks: ClaudeHooks = {
		...base.hooks,
	};

	// Add byteside UserPromptSubmit hooks
	if (bytesideHooks.UserPromptSubmit) {
		mergedHooks.UserPromptSubmit = [
			...(mergedHooks.UserPromptSubmit ?? []),
			...bytesideHooks.UserPromptSubmit,
		];
	}

	// Add byteside PreToolUse hooks
	if (bytesideHooks.PreToolUse) {
		mergedHooks.PreToolUse = [...(mergedHooks.PreToolUse ?? []), ...bytesideHooks.PreToolUse];
	}

	// Add byteside PostToolUse hooks
	if (bytesideHooks.PostToolUse) {
		mergedHooks.PostToolUse = [...(mergedHooks.PostToolUse ?? []), ...bytesideHooks.PostToolUse];
	}

	// Add byteside Notification hooks
	if (bytesideHooks.Notification) {
		mergedHooks.Notification = [...(mergedHooks.Notification ?? []), ...bytesideHooks.Notification];
	}

	// Add byteside Stop hooks
	if (bytesideHooks.Stop) {
		mergedHooks.Stop = [...(mergedHooks.Stop ?? []), ...bytesideHooks.Stop];
	}

	return {
		...base,
		hooks: mergedHooks,
	};
}

/**
 * Count byteside hooks in settings.
 */
export function countBytesideHooks(settings: ClaudeSettings | null): number {
	if (!settings?.hooks) {
		return 0;
	}

	let count = 0;

	const countInEntries = (entries: HookEntry[] | undefined) => {
		if (!entries) return;
		for (const entry of entries) {
			for (const hook of entry.hooks) {
				if (isBytesideHook(hook.command)) {
					count++;
				}
			}
		}
	};

	countInEntries(settings.hooks.UserPromptSubmit);
	countInEntries(settings.hooks.PreToolUse);
	countInEntries(settings.hooks.PostToolUse);
	countInEntries(settings.hooks.Notification);
	countInEntries(settings.hooks.Stop);

	return count;
}

/**
 * Check if byteside hooks are already installed.
 */
export function hasBytesideHooks(settings: ClaudeSettings | null): boolean {
	return countBytesideHooks(settings) > 0;
}

/**
 * Install byteside hooks to a settings file.
 */
export async function installHooks(
	path: string,
	options: InstallOptions = {},
): Promise<HookResult> {
	try {
		// Read existing settings
		let existing: ClaudeSettings | null = null;
		try {
			existing = await readClaudeSettings(path);
		} catch (error) {
			if (error instanceof SyntaxError) {
				return {
					success: false,
					message: `Invalid JSON in ${path}. Please fix the file manually.`,
				};
			}
			throw error;
		}

		// Check if already installed
		if (existing && hasBytesideHooks(existing) && !options.force) {
			return {
				success: false,
				message: "Byteside hooks already installed. Use --force to overwrite.",
			};
		}

		// Create backup if file exists
		let backupPath: string | null = null;
		if (existing && !options.noBackup) {
			backupPath = await createBackup(path);
		}

		// Generate and merge hooks
		const bytesideHooks = generateHookConfig();
		const merged = mergeHooks(existing, bytesideHooks);

		// Write settings
		await writeClaudeSettings(path, merged);

		const hookCount = countBytesideHooks(merged);
		return {
			success: true,
			message: `Installed ${hookCount} byteside hooks to ${path}`,
			backupPath: backupPath ?? undefined,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			message: `Failed to install hooks: ${message}`,
		};
	}
}

/**
 * Uninstall byteside hooks from a settings file.
 */
export async function uninstallHooks(
	path: string,
	options: { noBackup?: boolean } = {},
): Promise<HookResult> {
	try {
		// Read existing settings
		let existing: ClaudeSettings | null = null;
		try {
			existing = await readClaudeSettings(path);
		} catch (error) {
			if (error instanceof SyntaxError) {
				return {
					success: false,
					message: `Invalid JSON in ${path}. Please fix the file manually.`,
				};
			}
			throw error;
		}

		if (!existing) {
			return {
				success: true,
				message: `No settings file found at ${path}`,
			};
		}

		// Check if hooks exist
		if (!hasBytesideHooks(existing)) {
			return {
				success: true,
				message: "No byteside hooks found to remove",
			};
		}

		// Create backup
		let backupPath: string | null = null;
		if (!options.noBackup) {
			backupPath = await createBackup(path);
		}

		// Remove byteside hooks
		const cleaned = removeBytesideHooks(existing);

		// Write settings
		await writeClaudeSettings(path, cleaned);

		return {
			success: true,
			message: `Removed byteside hooks from ${path}`,
			backupPath: backupPath ?? undefined,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			message: `Failed to uninstall hooks: ${message}`,
		};
	}
}

/**
 * Get the status of hooks installation.
 */
export async function getHookStatus(path: string): Promise<HookStatus> {
	const exists = existsSync(path);

	if (!exists) {
		return {
			installed: false,
			hookCount: 0,
			path,
			exists: false,
		};
	}

	try {
		const settings = await readClaudeSettings(path);
		const hookCount = countBytesideHooks(settings);

		return {
			installed: hookCount > 0,
			hookCount,
			path,
			exists: true,
		};
	} catch {
		return {
			installed: false,
			hookCount: 0,
			path,
			exists: true,
		};
	}
}
