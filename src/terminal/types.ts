/**
 * Terminal capability protocols for image rendering.
 */
export type TerminalProtocol = "iterm" | "kitty" | "ansi";

/**
 * Detected terminal capabilities.
 */
export interface TerminalCapabilities {
	protocol: TerminalProtocol;
	supportsImages: boolean;
	supportsTrueColor: boolean;
}

/**
 * Terminal renderer options.
 */
export interface TerminalRendererOptions {
	avatarPath: string;
	framerate: number;
	size: { width: number; height: number };
	renderRow: number; // Row to start rendering at
}

/**
 * Loaded frame data for a single state.
 */
export interface StateFrames {
	frames: string[]; // Array of frame content (ASCII text or image paths)
	isImage: boolean; // Whether frames are image paths
}
