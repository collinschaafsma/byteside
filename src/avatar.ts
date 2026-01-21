import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseManifest } from "./manifest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Information about a discovered avatar.
 */
export interface DiscoveredAvatar {
	name: string;
	author: string;
	version: string;
	path: string;
}

/**
 * Get the user's avatar directory path.
 * @returns Path to ~/.byteside/avatars
 */
export function getUserAvatarsDir(): string {
	return join(homedir(), ".byteside", "avatars");
}

/**
 * Get the bundled avatars directory path.
 * @returns Path to the bundled public/avatars directory
 */
export function getBundledAvatarsDir(): string {
	return resolve(__dirname, "..", "public", "avatars");
}

/**
 * Expand paths that contain ~ to use the user's home directory.
 * @param paths Array of paths to expand
 * @returns Array of expanded paths
 */
export function expandAvatarPaths(paths: string[]): string[] {
	const home = homedir();
	return paths.map((p) => {
		if (p.startsWith("~/")) {
			return join(home, p.slice(2));
		}
		if (p === "~") {
			return home;
		}
		return resolve(p);
	});
}

/**
 * Ensure the user's avatar directory exists and contains the default avatar.
 * Creates ~/.byteside/avatars/ if it doesn't exist.
 * Copies the bundled default avatar if not present.
 */
export async function ensureUserAvatars(): Promise<void> {
	const userAvatarsDir = getUserAvatarsDir();
	const defaultAvatarDest = join(userAvatarsDir, "default");

	// Create avatars directory if it doesn't exist
	if (!existsSync(userAvatarsDir)) {
		await mkdir(userAvatarsDir, { recursive: true });
	}

	// Copy default avatar if it doesn't exist in user dir
	if (!existsSync(defaultAvatarDest)) {
		const bundledDefault = join(getBundledAvatarsDir(), "default");
		if (existsSync(bundledDefault)) {
			await cp(bundledDefault, defaultAvatarDest, { recursive: true });
		}
	}
}

/**
 * Discover all valid avatars in the given paths.
 * Scans each path for directories containing valid manifest.json files.
 * Silently skips directories without valid manifests.
 *
 * @param paths Array of paths to search for avatars
 * @returns Array of discovered avatar information
 */
export async function discoverAvatars(paths: string[]): Promise<DiscoveredAvatar[]> {
	const avatars: DiscoveredAvatar[] = [];
	const seenNames = new Set<string>();
	const expandedPaths = expandAvatarPaths(paths);

	for (const basePath of expandedPaths) {
		if (!existsSync(basePath)) {
			continue;
		}

		let entries: string[];
		try {
			entries = await readdir(basePath);
		} catch {
			continue;
		}

		for (const entry of entries) {
			const avatarPath = join(basePath, entry);
			const manifestPath = join(avatarPath, "manifest.json");

			if (!existsSync(manifestPath)) {
				continue;
			}

			try {
				const manifestContent = await readFile(manifestPath, "utf-8");
				const result = parseManifest(manifestContent);

				if (result.valid && result.manifest) {
					// Skip duplicate names (first found wins)
					if (seenNames.has(result.manifest.name)) {
						continue;
					}

					seenNames.add(result.manifest.name);
					avatars.push({
						name: result.manifest.name,
						author: result.manifest.author,
						version: result.manifest.version,
						path: avatarPath,
					});
				}
			} catch {}
		}
	}

	// Sort by name for consistent output
	avatars.sort((a, b) => a.name.localeCompare(b.name));

	return avatars;
}

/**
 * Resolve an avatar by name to its path.
 * Searches configured avatar paths for a matching avatar.
 *
 * @param name Avatar name to find
 * @param paths Array of paths to search
 * @returns Path to the avatar directory, or null if not found
 */
export async function resolveAvatarPath(name: string, paths: string[]): Promise<string | null> {
	const avatars = await discoverAvatars(paths);
	const found = avatars.find((a) => a.name === name);
	return found?.path ?? null;
}
