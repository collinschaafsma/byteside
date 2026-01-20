#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bold, cyan, dim, green, type RGBA, red, type StyledText, t, yellow } from "@opentui/core";
/**
 * byteside CLI - Start the avatar server with configurable options
 */
import { program } from "commander";
import open from "open";
import { ensureGlobalConfig, loadBytesideConfig } from "./config.js";

// Get the root directory (where nitro.config.ts is)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

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

// Nitro process reference for cleanup
let nitroProcess: ReturnType<typeof spawn> | null = null;

/**
 * Graceful shutdown handler
 */
function shutdown(signal: string): void {
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
 * Start the byteside server with the given configuration.
 */
function startServer(port: number, avatar: string, shouldOpen: boolean): void {
	printBanner();
	printStatus(`Starting server on port ${port}...`);
	printStatus(`Avatar: ${avatar}`);

	const url = `http://localhost:${port}`;
	let serverReady = false;

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

			// Auto-open browser
			if (shouldOpen) {
				printStatus("Opening browser...");
				open(url).then(() => {
					printStatus("Browser opened", "success");
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
 * Main entry point - loads config and starts the server.
 */
async function main(): Promise<void> {
	// Ensure global config exists on first run
	await ensureGlobalConfig();

	// Load configuration from files
	const config = await loadBytesideConfig();

	// Configure CLI with config values as defaults
	program
		.name("byteside")
		.description("Animated avatar companion for AI coding agents")
		.version("0.0.1")
		.option("-p, --port <number>", "Port to run server on", String(config.server?.port ?? 3333))
		.option("-a, --avatar <name>", "Avatar to use", config.avatar ?? "default")
		.option("--no-open", "Don't auto-open browser")
		.parse();

	const options = program.opts();

	// CLI args override config values
	const port = parseInt(options.port, 10);
	const avatar = options.avatar;
	// --no-open CLI flag or viewer.autoOpen: false in config both disable auto-open
	const shouldOpen = options.open !== false && config.viewer?.autoOpen !== false;

	startServer(port, avatar, shouldOpen);
}

main();
