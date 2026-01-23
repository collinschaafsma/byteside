import type { TerminalCapabilities, TerminalProtocol } from "./types.js";

/**
 * Detect terminal capabilities based on environment variables.
 */
export function detectCapabilities(): TerminalCapabilities {
	const env = process.env;
	let protocol: TerminalProtocol = "ansi";
	let supportsImages = false;

	// Check for iTerm2
	if (env["TERM_PROGRAM"] === "iTerm.app") {
		protocol = "iterm";
		supportsImages = true;
	}
	// Check for Kitty
	else if (env["TERM"] === "xterm-kitty") {
		protocol = "kitty";
		supportsImages = true;
	}
	// Check for WezTerm (uses Kitty protocol)
	else if (env["TERM_PROGRAM"] === "WezTerm") {
		protocol = "kitty";
		supportsImages = true;
	}

	// Check for true color support
	const colorTerm = env["COLORTERM"];
	const supportsTrueColor = colorTerm === "truecolor" || colorTerm === "24bit";

	return {
		protocol,
		supportsImages,
		supportsTrueColor,
	};
}

/**
 * Check if terminal supports the required features for terminal avatar mode.
 */
export function isTerminalCapable(): boolean {
	// For ASCII mode, we just need basic terminal support
	// which is always available
	return process.stdout.isTTY === true;
}
