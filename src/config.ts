import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "c12";

/**
 * Server configuration options.
 */
export interface ServerConfig {
	port?: number;
	host?: string;
}

/**
 * Viewer configuration options.
 */
export interface ViewerConfig {
	autoOpen?: boolean;
	showDebug?: boolean;
}

/**
 * Byteside configuration schema.
 */
export interface BytesideConfig {
	/** Default avatar to use */
	avatar?: string;
	/** Server settings */
	server?: ServerConfig;
	/** Viewer settings */
	viewer?: ViewerConfig;
	/** Avatar search paths (for future use) */
	avatarPaths?: string[];
}

/**
 * Default configuration values.
 */
export const defaults: BytesideConfig = {
	avatar: "default",
	server: {
		port: 3333,
		host: "localhost",
	},
	viewer: {
		autoOpen: true,
		showDebug: false,
	},
	avatarPaths: ["~/.byteside/avatars", "./avatars"],
};

/**
 * Load byteside configuration using c12.
 *
 * Config precedence (highest to lowest):
 * 1. CLI arguments (handled in cli.ts)
 * 2. Project config (.byteside.json in cwd)
 * 3. Global config (~/.byteside/config.json)
 * 4. Default values
 */
export async function loadBytesideConfig(): Promise<BytesideConfig> {
	const { config } = await loadConfig<BytesideConfig>({
		name: "byteside",
		configFile: ".byteside.json",
		globalRc: true,
		rcFile: "config.json",
		defaults,
	});
	return config;
}

/**
 * Get the global byteside directory path.
 */
export function getGlobalDir(): string {
	return join(homedir(), ".byteside");
}

/**
 * Get the global config file path.
 */
export function getGlobalConfigPath(): string {
	return join(getGlobalDir(), "config.json");
}

/**
 * Ensure the global config directory and file exist.
 * Creates ~/.byteside/config.json with defaults if it doesn't exist.
 */
export async function ensureGlobalConfig(): Promise<void> {
	const globalDir = getGlobalDir();
	const configPath = getGlobalConfigPath();

	if (!existsSync(configPath)) {
		await mkdir(globalDir, { recursive: true });
		await writeFile(configPath, JSON.stringify(defaults, null, "\t"));
	}
}
