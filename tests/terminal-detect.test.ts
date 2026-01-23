import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectCapabilities, isTerminalCapable } from "../src/terminal/detect";

describe("terminal detection", () => {
	const originalEnv = { ...process.env };
	const originalIsTTY = process.stdout.isTTY;

	beforeEach(() => {
		// Reset environment
		process.env = { ...originalEnv };
		// Clear any terminal-related env vars
		delete process.env.TERM_PROGRAM;
		delete process.env.TERM;
		delete process.env.COLORTERM;
	});

	afterEach(() => {
		process.env = originalEnv;
		Object.defineProperty(process.stdout, "isTTY", {
			value: originalIsTTY,
			writable: true,
		});
	});

	describe("detectCapabilities()", () => {
		it("detects iTerm2 terminal", () => {
			process.env.TERM_PROGRAM = "iTerm.app";

			const caps = detectCapabilities();

			expect(caps.protocol).toBe("iterm");
			expect(caps.supportsImages).toBe(true);
		});

		it("detects Kitty terminal", () => {
			process.env.TERM = "xterm-kitty";

			const caps = detectCapabilities();

			expect(caps.protocol).toBe("kitty");
			expect(caps.supportsImages).toBe(true);
		});

		it("detects WezTerm terminal (uses kitty protocol)", () => {
			process.env.TERM_PROGRAM = "WezTerm";

			const caps = detectCapabilities();

			expect(caps.protocol).toBe("kitty");
			expect(caps.supportsImages).toBe(true);
		});

		it("falls back to ansi for unknown terminals", () => {
			process.env.TERM_PROGRAM = "Unknown";
			process.env.TERM = "xterm-256color";

			const caps = detectCapabilities();

			expect(caps.protocol).toBe("ansi");
			expect(caps.supportsImages).toBe(false);
		});

		it("falls back to ansi when no terminal info available", () => {
			const caps = detectCapabilities();

			expect(caps.protocol).toBe("ansi");
			expect(caps.supportsImages).toBe(false);
		});

		it("detects true color support via COLORTERM=truecolor", () => {
			process.env.COLORTERM = "truecolor";

			const caps = detectCapabilities();

			expect(caps.supportsTrueColor).toBe(true);
		});

		it("detects true color support via COLORTERM=24bit", () => {
			process.env.COLORTERM = "24bit";

			const caps = detectCapabilities();

			expect(caps.supportsTrueColor).toBe(true);
		});

		it("reports no true color when COLORTERM is not set", () => {
			const caps = detectCapabilities();

			expect(caps.supportsTrueColor).toBe(false);
		});

		it("reports no true color for other COLORTERM values", () => {
			process.env.COLORTERM = "256color";

			const caps = detectCapabilities();

			expect(caps.supportsTrueColor).toBe(false);
		});

		it("combines iTerm2 detection with true color", () => {
			process.env.TERM_PROGRAM = "iTerm.app";
			process.env.COLORTERM = "truecolor";

			const caps = detectCapabilities();

			expect(caps.protocol).toBe("iterm");
			expect(caps.supportsImages).toBe(true);
			expect(caps.supportsTrueColor).toBe(true);
		});

		it("combines Kitty detection with true color", () => {
			process.env.TERM = "xterm-kitty";
			process.env.COLORTERM = "truecolor";

			const caps = detectCapabilities();

			expect(caps.protocol).toBe("kitty");
			expect(caps.supportsImages).toBe(true);
			expect(caps.supportsTrueColor).toBe(true);
		});
	});

	describe("isTerminalCapable()", () => {
		it("returns true when stdout is a TTY", () => {
			Object.defineProperty(process.stdout, "isTTY", {
				value: true,
				writable: true,
			});

			expect(isTerminalCapable()).toBe(true);
		});

		it("returns false when stdout is not a TTY", () => {
			Object.defineProperty(process.stdout, "isTTY", {
				value: false,
				writable: true,
			});

			expect(isTerminalCapable()).toBe(false);
		});

		it("returns false when isTTY is undefined", () => {
			Object.defineProperty(process.stdout, "isTTY", {
				value: undefined,
				writable: true,
			});

			expect(isTerminalCapable()).toBe(false);
		});
	});
});
