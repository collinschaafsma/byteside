#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bold, cyan, dim, green, type RGBA, red, type StyledText, t, yellow } from "@opentui/core";
/**
 * byteside CLI - Start the avatar server with configurable options
 */
import { program } from "commander";
import open from "open";
import { discoverAvatars, ensureUserAvatars, resolveAvatarPath } from "./avatar.js";
import { ensureGlobalConfig, loadBytesideConfig } from "./config.js";
import {
	generateHookConfig,
	getGlobalClaudeSettingsPath,
	getHookStatus,
	getProjectClaudeSettingsPath,
	installHooks,
	uninstallHooks,
} from "./hooks.js";
import { type AvatarManifest, validateAvatar } from "./manifest.js";
import {
	createTerminalRenderer,
	isTerminalCapable,
	type TerminalRenderer,
} from "./terminal/index.js";
import { type AvatarState, REQUIRED_STATES } from "./types.js";

// Get the root directory (where nitro.config.ts is)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// Viewer window dimensions (256px video + 64px padding + 24px gap + 20px label + margin)
const VIEWER_WIDTH = 340;
const VIEWER_HEIGHT = 390;

// Chrome paths by platform
const CHROME_PATHS: Record<string, string[]> = {
	darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
	win32: [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	],
	linux: [
		"/usr/bin/google-chrome",
		"/usr/bin/google-chrome-stable",
		"/usr/bin/chromium",
		"/usr/bin/chromium-browser",
	],
};

/**
 * Find Chrome executable path for the current platform.
 */
async function findChrome(): Promise<string | null> {
	const paths = CHROME_PATHS[process.platform] ?? [];
	const { existsSync } = await import("node:fs");
	for (const p of paths) {
		if (existsSync(p)) {
			return p;
		}
	}
	return null;
}

/**
 * Open the viewer in a browser window.
 * Tries Chrome app mode first for a minimal popup window, falls back to default browser.
 * @returns "app" if opened in app mode, "browser" if opened in regular browser
 */
async function openViewer(url: string): Promise<"app" | "browser"> {
	// Try Chrome app mode for a clean, chromeless window
	const chromePath = await findChrome();
	if (chromePath) {
		try {
			const { homedir } = await import("node:os");
			const { join } = await import("node:path");
			// Use a separate user data dir so Chrome respects our window size
			const userDataDir = join(homedir(), ".byteside", "chrome-profile");
			const args = [
				`--app=${url}`,
				`--window-size=${VIEWER_WIDTH},${VIEWER_HEIGHT}`,
				`--user-data-dir=${userDataDir}`,
			];
			const proc = spawn(chromePath, args, { detached: true, stdio: "ignore" });
			proc.unref();
			return "app";
		} catch {
			// Fall through to default browser
		}
	}

	// Fall back to default browser
	await open(url);
	return "browser";
}

// ANSI attribute bits (match @opentui/core internal encoding)
const ATTR_BOLD = 1 << 0;
const ATTR_ITALIC = 1 << 1;
const ATTR_UNDERLINE = 1 << 2;
const ATTR_DIM = 1 << 4;

/**
 * Convert an RGBA color to ANSI escape code
 */
function rgbaToAnsi(rgba: RGBA, isBg = false): string {
	const [r, g, b] = rgba.toInts();
	return isBg ? `\x1b[48;2;${r};${g};${b}m` : `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Convert TextChunk attributes to ANSI codes
 */
function attrsToAnsi(attrs: number | undefined): string {
	if (!attrs) return "";
	let codes = "";
	if (attrs & ATTR_BOLD) codes += "\x1b[1m";
	if (attrs & ATTR_ITALIC) codes += "\x1b[3m";
	if (attrs & ATTR_UNDERLINE) codes += "\x1b[4m";
	if (attrs & ATTR_DIM) codes += "\x1b[2m";
	return codes;
}

/**
 * Render StyledText to an ANSI-formatted string for console output
 */
function renderStyledText(styled: StyledText): string {
	const reset = "\x1b[0m";
	let result = "";

	for (const chunk of styled.chunks) {
		let codes = "";

		if (chunk.fg) {
			codes += rgbaToAnsi(chunk.fg, false);
		}
		if (chunk.bg) {
			codes += rgbaToAnsi(chunk.bg, true);
		}
		if (chunk.attributes) {
			codes += attrsToAnsi(chunk.attributes);
		}

		result += codes + chunk.text + (codes ? reset : "");
	}

	return result;
}

/**
 * Log styled text to console
 */
function log(styled: StyledText): void {
	console.log(renderStyledText(styled));
}

/**
 * Print the startup banner
 */
function printBanner(): void {
	log(t`${bold(cyan("byteside"))} ${dim("- animated avatar companion")}`);
	log(t`${dim("─".repeat(40))}`);
}

/**
 * Print server status message
 */
function printStatus(message: string, type: "info" | "success" | "warn" | "error" = "info"): void {
	const icon =
		type === "success"
			? green("✓")
			: type === "warn"
				? yellow("!")
				: type === "error"
					? red("✗")
					: cyan("→");
	log(t`  ${icon} ${message}`);
}

// Process references for cleanup
let nitroProcess: ReturnType<typeof spawn> | null = null;
let terminalRenderer: TerminalRenderer | null = null;

/**
 * Graceful shutdown handler
 */
function shutdown(signal: string): void {
	// Stop terminal renderer first (restores terminal state)
	if (terminalRenderer) {
		terminalRenderer.stop();
		terminalRenderer = null;
	}

	log(t``);
	printStatus(`Received ${signal}, shutting down...`, "warn");

	if (nitroProcess) {
		nitroProcess.kill("SIGTERM");
	}

	printStatus("Goodbye!", "success");
	process.exit(0);
}

// Handle shutdown signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/**
 * Options for starting the server.
 */
interface StartServerOptions {
	port: number;
	avatar: string;
	shouldOpen: boolean;
	noTerminal: boolean;
	manifest: AvatarManifest | null;
	avatarPath: string | null;
}

/**
 * Start the byteside server with the given configuration.
 */
async function startServer(options: StartServerOptions): Promise<void> {
	const { port, avatar, shouldOpen, noTerminal, manifest, avatarPath } = options;

	printBanner();
	printStatus(`Starting server on port ${port}...`);
	printStatus(`Avatar: ${avatar}`);

	const url = `http://localhost:${port}`;
	let serverReady = false;

	// Check if terminal mode is available and enabled
	const useTerminalMode =
		!noTerminal &&
		manifest?.terminal?.enabled === true &&
		avatarPath !== null &&
		isTerminalCapable();

	if (useTerminalMode) {
		printStatus("Terminal mode enabled", "info");
	}

	// Spawn nitro dev process with runtime config via environment variable
	nitroProcess = spawn("bun", ["x", "nitro", "dev", "--port", port.toString()], {
		cwd: rootDir,
		env: {
			...process.env,
			// Pass avatar via environment variable (Nitro uses NITRO_PUBLIC_ prefix)
			NITRO_PUBLIC_AVATAR: avatar,
		},
		stdio: ["inherit", "pipe", "pipe"],
	});

	// Handle stdout
	nitroProcess.stdout?.on("data", (data: Buffer) => {
		const text = data.toString();

		// Check if server is ready
		if (!serverReady && text.includes("Listening on:")) {
			serverReady = true;
			printStatus(`Server running at ${url}`, "success");

			// Start terminal renderer or open browser based on mode
			if (useTerminalMode && manifest && avatarPath) {
				// Terminal mode: start renderer
				const renderer = createTerminalRenderer(manifest, avatarPath, 12);
				if (renderer) {
					terminalRenderer = renderer;
					renderer
						.init()
						.then(() => renderer.start(url))
						.then(() => {
							printStatus("Terminal renderer started", "success");
						})
						.catch((err) => {
							printStatus(`Failed to start terminal renderer: ${err.message}`, "error");
						});
				}
			} else if (shouldOpen) {
				// Browser mode: auto-open browser
				printStatus("Opening viewer...");
				openViewer(url)
					.then((mode) => {
						printStatus(`Viewer opened${mode === "app" ? " (app mode)" : ""}`, "success");
					})
					.catch((err) => {
						printStatus(`Failed to open viewer: ${err.message}`, "error");
					});
			}

			log(t``);
			log(t`  ${dim("Press Ctrl+C to stop")}`);
			log(t``);
		}

		// Forward nitro output (filter out duplicate listening message)
		if (!text.includes("Listening on:")) {
			process.stdout.write(text);
		}
	});

	// Handle stderr
	nitroProcess.stderr?.on("data", (data: Buffer) => {
		process.stderr.write(data);
	});

	// Handle process exit
	nitroProcess.on("close", (code) => {
		if (code !== 0 && code !== null) {
			printStatus(`Server exited with code ${code}`, "error");
			process.exit(code);
		}
	});

	nitroProcess.on("error", (err) => {
		printStatus(`Failed to start server: ${err.message}`, "error");
		process.exit(1);
	});
}

/**
 * List all installed avatars.
 */
async function listAvatars(): Promise<void> {
	const config = await loadBytesideConfig();
	const paths = config.avatarPaths ?? ["~/.byteside/avatars"];
	const avatars = await discoverAvatars(paths);

	if (avatars.length === 0) {
		log(t`${yellow("No avatars found.")}`);
		log(t`${dim("Run 'byteside' once to install the default avatar.")}`);
		return;
	}

	// Calculate column widths
	const nameWidth = Math.max(20, ...avatars.map((a) => a.name.length));
	const authorWidth = Math.max(20, ...avatars.map((a) => a.author.length));

	// Print header
	log(
		t`${bold("Name".padEnd(nameWidth))}  ${bold("Author".padEnd(authorWidth))}  ${bold("Version")}`,
	);
	log(t`${dim("─".repeat(nameWidth + authorWidth + 20))}`);

	// Print each avatar
	for (const avatar of avatars) {
		log(
			t`${avatar.name.padEnd(nameWidth)}  ${avatar.author.padEnd(authorWidth)}  ${avatar.version}`,
		);
	}
}

/**
 * Validate an avatar package.
 */
async function validateAvatarCommand(path: string): Promise<void> {
	const avatarPath = resolve(path);
	const result = await validateAvatar(avatarPath);

	if (!result.valid) {
		printStatus("Validation failed", "error");
		log(t``);

		for (const error of result.errors) {
			log(t`  ${red("✗")} ${error}`);
		}

		for (const warning of result.warnings) {
			log(t`  ${yellow("!")} ${warning}`);
		}

		process.exit(1);
	}

	// Success - show avatar info
	printStatus("Validation passed", "success");
	log(t``);

	if (result.manifest) {
		log(t`  ${bold("Name:")}     ${result.manifest.name}`);
		log(t`  ${bold("Author:")}   ${result.manifest.author}`);
		log(t`  ${bold("Version:")}  ${result.manifest.version}`);
		log(t`  ${bold("Format:")}   ${result.manifest.format}`);
		log(t`  ${bold("States:")}   ${Object.keys(result.manifest.states).join(", ")}`);
	}

	// Show warnings if any
	if (result.warnings.length > 0) {
		log(t``);
		log(t`  ${bold("Warnings:")}`);
		for (const warning of result.warnings) {
			log(t`  ${yellow("!")} ${warning}`);
		}
	}
}

/**
 * Main entry point - sets up CLI and parses commands.
 */
async function main(): Promise<void> {
	// Load configuration from files
	const config = await loadBytesideConfig();

	program
		.name("byteside")
		.description("Animated avatar companion for AI coding agents")
		.version("0.0.1")
		.hook("preAction", async () => {
			// Ensure global config and user avatars exist on first run
			await ensureGlobalConfig();
			await ensureUserAvatars();
		});

	// Default command: start server
	program
		.option("-p, --port <number>", "Port to run server on", String(config.server?.port ?? 3333))
		.option("-a, --avatar <name>", "Avatar to use", config.avatar ?? "default")
		.option("--no-open", "Don't auto-open browser")
		.option("--no-terminal", "Disable terminal avatar rendering")
		.action(async (options) => {
			const port = parseInt(options.port, 10);
			const avatar = options.avatar;
			const shouldOpen = options.open !== false && config.viewer?.autoOpen !== false;
			const noTerminal = options.terminal === false;

			// Try to resolve avatar path and load manifest
			const avatarPaths = config.avatarPaths ?? ["~/.byteside/avatars"];
			const avatarPath = await resolveAvatarPath(avatar, avatarPaths);
			let manifest: AvatarManifest | null = null;

			if (avatarPath) {
				const result = await validateAvatar(avatarPath);
				if (result.valid && result.manifest) {
					manifest = result.manifest;
				}
			}

			await startServer({
				port,
				avatar,
				shouldOpen,
				noTerminal,
				manifest,
				avatarPath,
			});
		});

	// List command
	program.command("list").description("List installed avatars").action(listAvatars);

	// Validate command
	program
		.command("validate <path>")
		.description("Validate an avatar package")
		.action(validateAvatarCommand);

	// Init command - install hooks
	program
		.command("init")
		.description("Install Claude Code hooks for avatar state changes")
		.option("-g, --global", "Install to global settings (~/.claude/settings.json)")
		.option("-p, --project", "Install to project settings (.claude/settings.json)", true)
		.option("-f, --force", "Overwrite existing hooks")
		.option("--no-backup", "Skip backup creation")
		.action(async (options) => {
			const path = options.global ? getGlobalClaudeSettingsPath() : getProjectClaudeSettingsPath();

			const result = await installHooks(path, {
				force: options.force,
				noBackup: !options.backup,
			});

			if (result.success) {
				printStatus(result.message, "success");
				if (result.backupPath) {
					printStatus(`Backup created: ${result.backupPath}`, "info");
				}
			} else {
				printStatus(result.message, "error");
				process.exit(1);
			}
		});

	// Trigger command - set avatar state
	program
		.command("trigger <state>")
		.description("Set avatar state (used by Claude Code hooks)")
		.action(async (state: string) => {
			// Validate state
			if (!REQUIRED_STATES.includes(state as AvatarState)) {
				// Silent failure for hooks
				process.exit(1);
			}

			// Load config to get port
			const port = config.server?.port ?? 3333;

			// POST to server (silent, fail gracefully)
			try {
				await fetch(`http://localhost:${port}/state`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ state }),
					signal: AbortSignal.timeout(1000),
				});
			} catch {
				// Silent failure - server may not be running
			}
		});

	// Hooks subcommand group
	const hooksCmd = program.command("hooks").description("Manage Claude Code hooks");

	// hooks status
	hooksCmd
		.command("status")
		.description("Show hooks installation status")
		.option("-g, --global", "Check global settings")
		.option("-p, --project", "Check project settings", true)
		.action(async (options) => {
			const path = options.global ? getGlobalClaudeSettingsPath() : getProjectClaudeSettingsPath();

			const status = await getHookStatus(path);

			log(t`${bold("Hooks Status")}`);
			log(t`${dim("─".repeat(40))}`);
			log(t`  ${bold("Path:")} ${status.path}`);
			log(t`  ${bold("File exists:")} ${status.exists ? green("yes") : yellow("no")}`);

			if (status.installed) {
				log(t`  ${green("✓")} ${status.hookCount} byteside hooks installed`);
			} else {
				log(t`  ${yellow("!")} No byteside hooks found`);
				log(t``);
				log(t`  ${dim("Run 'byteside init' to install hooks")}`);
			}
		});

	// hooks uninstall
	hooksCmd
		.command("uninstall")
		.description("Remove byteside hooks")
		.option("-g, --global", "Remove from global settings")
		.option("-p, --project", "Remove from project settings", true)
		.option("--all", "Remove from both global and project settings")
		.option("--no-backup", "Skip backup creation")
		.action(async (options) => {
			const paths: string[] = [];

			if (options.all) {
				paths.push(getGlobalClaudeSettingsPath());
				paths.push(getProjectClaudeSettingsPath());
			} else if (options.global) {
				paths.push(getGlobalClaudeSettingsPath());
			} else {
				paths.push(getProjectClaudeSettingsPath());
			}

			for (const path of paths) {
				const result = await uninstallHooks(path, {
					noBackup: !options.backup,
				});

				if (result.success) {
					printStatus(result.message, "success");
					if (result.backupPath) {
						printStatus(`Backup created: ${result.backupPath}`, "info");
					}
				} else {
					printStatus(result.message, "error");
				}
			}
		});

	// hooks show
	hooksCmd
		.command("show")
		.description("Preview generated hook configuration")
		.action(() => {
			const hooks = generateHookConfig();
			console.log(JSON.stringify({ hooks }, null, "\t"));
		});

	await program.parseAsync();
}

main();
