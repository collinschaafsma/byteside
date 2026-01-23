import WebSocket from "ws";
import type { AvatarManifest, TerminalConfig } from "../manifest.js";
import type { AvatarState } from "../types.js";
import { preloadAllFrames } from "./ascii-loader.js";
import type { StateFrames, TerminalRendererOptions } from "./types.js";

// ANSI escape codes
const ESC = "\x1b";
const SAVE_CURSOR = `${ESC}[s`;
const RESTORE_CURSOR = `${ESC}[u`;
const CLEAR_LINE = `${ESC}[K`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

function moveTo(row: number, col: number): string {
	return `${ESC}[${row};${col}H`;
}

/**
 * Terminal renderer for displaying avatar animations in the terminal.
 */
export class TerminalRenderer {
	private manifest: AvatarManifest;
	private terminalConfig: TerminalConfig;
	private options: TerminalRendererOptions;
	private stateFrames: Map<string, StateFrames> = new Map();
	private currentState: AvatarState = "idle";
	private frameIndex = 0;
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private transitionTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private ws: WebSocket | null = null;
	private isRunning = false;
	private terminalImageModule: typeof import("terminal-image")["default"] | null = null;

	constructor(manifest: AvatarManifest, options: TerminalRendererOptions) {
		if (!manifest.terminal) {
			throw new Error("Terminal config is required");
		}
		this.manifest = manifest;
		this.terminalConfig = manifest.terminal;
		this.options = options;
	}

	/**
	 * Initialize the renderer by loading all frames.
	 */
	async init(): Promise<void> {
		// Preload all frames
		this.stateFrames = await preloadAllFrames(this.terminalConfig, this.options.avatarPath);

		// Load terminal-image module if using image mode
		if (this.terminalConfig.mode === "image") {
			try {
				const mod = await import("terminal-image");
				this.terminalImageModule = mod.default;
			} catch {
				console.error("Failed to load terminal-image module for image mode");
			}
		}
	}

	/**
	 * Start the renderer and connect to WebSocket for state updates.
	 */
	async start(serverUrl: string): Promise<void> {
		if (this.isRunning) return;
		this.isRunning = true;

		// Hide cursor and save terminal state
		process.stdout.write(HIDE_CURSOR);

		// Connect to WebSocket for state updates
		this.connectWebSocket(serverUrl);

		// Start animation loop
		const framerate = this.options.framerate;
		this.intervalId = setInterval(() => {
			this.renderCurrentFrame();
			this.advanceFrame();
		}, 1000 / framerate);

		// Handle resize
		process.on("SIGWINCH", this.handleResize);
	}

	/**
	 * Stop the renderer and clean up.
	 */
	stop(): void {
		if (!this.isRunning) return;
		this.isRunning = false;

		// Stop animation loop
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		// Clear any pending transition
		if (this.transitionTimeoutId) {
			clearTimeout(this.transitionTimeoutId);
			this.transitionTimeoutId = null;
		}

		// Close WebSocket
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		// Remove resize handler
		process.off("SIGWINCH", this.handleResize);

		// Show cursor and clear render area
		this.clearRenderArea();
		process.stdout.write(SHOW_CURSOR);
	}

	/**
	 * Set the current avatar state.
	 */
	setState(state: AvatarState): void {
		if (state !== this.currentState && this.stateFrames.has(state)) {
			// Clear any pending transition
			if (this.transitionTimeoutId) {
				clearTimeout(this.transitionTimeoutId);
				this.transitionTimeoutId = null;
			}

			this.currentState = state;
			this.frameIndex = 0;

			// Check if this state has an auto-transition
			const stateConfig = this.manifest.states[state];
			if (stateConfig?.duration && stateConfig?.transition_to) {
				const targetState = stateConfig.transition_to as AvatarState;
				this.transitionTimeoutId = setTimeout(() => {
					this.setState(targetState);
				}, stateConfig.duration);
			}
		}
	}

	/**
	 * Connect to the WebSocket server for state updates.
	 */
	private connectWebSocket(serverUrl: string): void {
		const wsUrl = `${serverUrl.replace(/^http/, "ws")}/_ws`;

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.on("message", (data) => {
				try {
					const parsed = JSON.parse(String(data));
					if ((parsed.type === "state" || parsed.type === "welcome") && parsed.state) {
						this.setState(parsed.state);
					}
				} catch {
					// Ignore invalid messages
				}
			});

			this.ws.on("error", () => {
				// Silent error - will retry on reconnect
			});

			this.ws.on("close", () => {
				// Attempt to reconnect after delay if still running
				if (this.isRunning) {
					setTimeout(() => this.connectWebSocket(serverUrl), 1000);
				}
			});
		} catch {
			// Silent error - will retry
		}
	}

	/**
	 * Render the current frame to the terminal.
	 */
	private renderCurrentFrame(): void {
		const stateData = this.stateFrames.get(this.currentState);
		if (!stateData || stateData.frames.length === 0) return;

		const frame = stateData.frames[this.frameIndex];
		if (!frame) return;

		if (stateData.isImage) {
			this.renderImageFrame(frame);
		} else {
			this.renderAsciiFrame(frame);
		}
	}

	/**
	 * Render an ASCII art frame.
	 */
	private renderAsciiFrame(frame: string): void {
		const lines = frame.split("\n");
		const { renderRow } = this.options;
		const { width, height } = this.options.size;

		// Save cursor position
		process.stdout.write(SAVE_CURSOR);

		// Move to render area and write each line
		for (let i = 0; i < height; i++) {
			const line = lines[i] ?? "";
			// Pad or truncate line to width
			const paddedLine = line.substring(0, width).padEnd(width);
			process.stdout.write(moveTo(renderRow + i, 1) + paddedLine + CLEAR_LINE);
		}

		// Restore cursor position
		process.stdout.write(RESTORE_CURSOR);
	}

	/**
	 * Render an image frame using terminal-image.
	 */
	private async renderImageFrame(imagePath: string): Promise<void> {
		if (!this.terminalImageModule) return;

		try {
			const { width, height } = this.options.size;
			const image = await this.terminalImageModule.file(imagePath, {
				width,
				height,
				preserveAspectRatio: true,
			});

			// Save cursor, move to render area, write image, restore cursor
			process.stdout.write(
				SAVE_CURSOR + moveTo(this.options.renderRow, 1) + image + RESTORE_CURSOR,
			);
		} catch {
			// Silent error for image rendering
		}
	}

	/**
	 * Advance to the next frame.
	 */
	private advanceFrame(): void {
		const stateData = this.stateFrames.get(this.currentState);
		if (!stateData || stateData.frames.length === 0) return;

		this.frameIndex = (this.frameIndex + 1) % stateData.frames.length;
	}

	/**
	 * Clear the render area.
	 */
	private clearRenderArea(): void {
		const { renderRow } = this.options;
		const { height } = this.options.size;

		process.stdout.write(SAVE_CURSOR);
		for (let i = 0; i < height; i++) {
			process.stdout.write(moveTo(renderRow + i, 1) + CLEAR_LINE);
		}
		process.stdout.write(RESTORE_CURSOR);
	}

	/**
	 * Handle terminal resize.
	 */
	private handleResize = (): void => {
		// Re-render current frame to adjust to new size
		this.renderCurrentFrame();
	};
}

/**
 * Create a terminal renderer from a manifest.
 */
export function createTerminalRenderer(
	manifest: AvatarManifest,
	avatarPath: string,
	renderRow = 10,
): TerminalRenderer | null {
	if (!manifest.terminal?.enabled) {
		return null;
	}

	const terminalConfig = manifest.terminal;
	const options: TerminalRendererOptions = {
		avatarPath,
		framerate: terminalConfig.framerate ?? 8,
		size: terminalConfig.size ?? { width: 40, height: 20 },
		renderRow,
	};

	return new TerminalRenderer(manifest, options);
}
