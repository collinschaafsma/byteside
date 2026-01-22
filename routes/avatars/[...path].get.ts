import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { createError, defineEventHandler, getRouterParam, setHeader } from "h3";
import { getBundledAvatarsDir, resolveAvatarPath } from "../../src/avatar.js";
import { loadBytesideConfig } from "../../src/config.js";

/**
 * MIME types for avatar files.
 */
const MIME_TYPES: Record<string, string> = {
	".json": "application/json",
	".webm": "video/webm",
	".mp4": "video/mp4",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
};

/**
 * GET /avatars/[...path] - Serves avatar files from custom avatar directories.
 *
 * This route handles requests like:
 *   /avatars/cyborg/manifest.json
 *   /avatars/cyborg/idle.webm
 *
 * It first checks if the avatar exists in user-configured paths (e.g., ~/.byteside/avatars),
 * and serves from there. If not found, Nitro's static file serving will handle bundled avatars.
 */
export default defineEventHandler(async (event) => {
	const path = getRouterParam(event, "path");

	if (!path) {
		throw createError({ statusCode: 400, statusMessage: "Missing path" });
	}

	// Parse avatar name and file from path (e.g., "cyborg/manifest.json")
	const segments = path.split("/");
	if (segments.length < 2) {
		throw createError({ statusCode: 400, statusMessage: "Invalid avatar path" });
	}

	const avatarName = segments[0];
	const filePath = segments.slice(1).join("/");

	// Security: prevent directory traversal
	if (filePath.includes("..") || avatarName.includes("..")) {
		throw createError({ statusCode: 400, statusMessage: "Invalid path" });
	}

	// Load config to get avatar search paths
	const config = await loadBytesideConfig();
	const avatarPaths = config.avatarPaths ?? ["~/.byteside/avatars"];

	// Try to resolve the avatar path from custom directories first
	let avatarDir = await resolveAvatarPath(avatarName, avatarPaths);

	// Fall back to bundled avatars directory
	if (!avatarDir) {
		const bundledDir = getBundledAvatarsDir();
		const bundledAvatarDir = join(bundledDir, avatarName);
		if (existsSync(join(bundledAvatarDir, "manifest.json"))) {
			avatarDir = bundledAvatarDir;
		}
	}

	if (!avatarDir) {
		throw createError({ statusCode: 404, statusMessage: "Avatar not found" });
	}

	// Build full file path
	const fullPath = join(avatarDir, filePath);

	// Security: ensure the resolved path is within the avatar directory
	if (!fullPath.startsWith(avatarDir)) {
		throw createError({ statusCode: 400, statusMessage: "Invalid path" });
	}

	// Check if file exists
	if (!existsSync(fullPath)) {
		throw createError({ statusCode: 404, statusMessage: "File not found" });
	}

	// Determine content type
	const ext = extname(fullPath).toLowerCase();
	const contentType = MIME_TYPES[ext] || "application/octet-stream";

	// Read and return the file
	const content = await readFile(fullPath);

	setHeader(event, "Content-Type", contentType);
	setHeader(event, "Cache-Control", "public, max-age=3600");

	return content;
});
