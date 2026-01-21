import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TerminalConfig, TerminalStateConfig } from "../manifest.js";
import type { StateFrames } from "./types.js";

/**
 * Cache for loaded ASCII frames to avoid re-reading from disk.
 */
const frameCache = new Map<string, string>();

/**
 * Load a single ASCII frame from disk.
 */
async function loadFrame(framePath: string, avatarDir: string): Promise<string> {
	const fullPath = join(avatarDir, framePath);

	// Check cache first
	const cached = frameCache.get(fullPath);
	if (cached !== undefined) {
		return cached;
	}

	// Read from disk
	const content = await readFile(fullPath, "utf-8");
	frameCache.set(fullPath, content);

	return content;
}

/**
 * Load all frames for a terminal state.
 */
export async function loadStateFrames(
	stateConfig: TerminalStateConfig,
	avatarDir: string,
	mode: "ascii" | "image",
): Promise<StateFrames> {
	if (mode === "ascii" && stateConfig.frames) {
		// Load all ASCII frames
		const frames = await Promise.all(
			stateConfig.frames.map((framePath) => loadFrame(framePath, avatarDir)),
		);
		return { frames, isImage: false };
	}

	if (mode === "image" && stateConfig.image) {
		// For image mode, return the full path to the image
		const imagePath = join(avatarDir, stateConfig.image);
		return { frames: [imagePath], isImage: true };
	}

	// Fallback to empty frame
	return { frames: [""], isImage: false };
}

/**
 * Preload all frames for all states.
 */
export async function preloadAllFrames(
	terminalConfig: TerminalConfig,
	avatarDir: string,
): Promise<Map<string, StateFrames>> {
	const stateFrames = new Map<string, StateFrames>();

	for (const [stateName, stateConfig] of Object.entries(terminalConfig.states)) {
		const frames = await loadStateFrames(stateConfig, avatarDir, terminalConfig.mode);
		stateFrames.set(stateName, frames);
	}

	return stateFrames;
}

/**
 * Clear the frame cache.
 */
export function clearFrameCache(): void {
	frameCache.clear();
}
