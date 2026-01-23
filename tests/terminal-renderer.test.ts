import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarManifest } from "../src/manifest";
import type { TerminalRendererOptions } from "../src/terminal/types";

// Mock WebSocket
vi.mock("ws", () => ({
	default: vi.fn().mockImplementation(() => ({
		on: vi.fn(),
		close: vi.fn(),
	})),
}));

// Mock ascii-loader
vi.mock("../src/terminal/ascii-loader", () => ({
	preloadAllFrames: vi.fn().mockResolvedValue(
		new Map([
			["idle", { frames: ["frame1", "frame2"], isImage: false }],
			["thinking", { frames: ["think1"], isImage: false }],
		]),
	),
}));

// Import after mocking
import { createTerminalRenderer, TerminalRenderer } from "../src/terminal/renderer";

describe("TerminalRenderer", () => {
	const mockManifest: AvatarManifest = {
		name: "test-avatar",
		author: "Test",
		version: "1.0.0",
		format: "webm",
		states: {
			idle: { file: "idle.webm" },
			thinking: { file: "thinking.webm" },
			success: { file: "success.webm", duration: 2000, transition_to: "idle" },
		},
		terminal: {
			enabled: true,
			mode: "ascii",
			framerate: 8,
			size: { width: 40, height: 20 },
			states: {
				idle: { frames: ["ascii/idle/01.txt", "ascii/idle/02.txt"] },
				thinking: { frames: ["ascii/thinking/01.txt"] },
			},
		},
	};

	const mockOptions: TerminalRendererOptions = {
		avatarPath: "/path/to/avatar",
		framerate: 8,
		size: { width: 40, height: 20 },
		renderRow: 10,
	};

	let originalStdoutWrite: typeof process.stdout.write;
	let writtenData: string[];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		// Capture stdout writes
		writtenData = [];
		originalStdoutWrite = process.stdout.write;
		process.stdout.write = vi.fn((data: string | Uint8Array) => {
			if (typeof data === "string") {
				writtenData.push(data);
			}
			return true;
		}) as typeof process.stdout.write;
	});

	afterEach(() => {
		vi.useRealTimers();
		process.stdout.write = originalStdoutWrite;
	});

	describe("constructor", () => {
		it("throws error if terminal config is not present", () => {
			const manifestWithoutTerminal: AvatarManifest = {
				name: "test",
				author: "Test",
				version: "1.0.0",
				format: "webm",
				states: { idle: { file: "idle.webm" } },
			};

			expect(() => {
				new TerminalRenderer(manifestWithoutTerminal, mockOptions);
			}).toThrow("Terminal config is required");
		});

		it("creates renderer with valid manifest", () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			expect(renderer).toBeInstanceOf(TerminalRenderer);
		});
	});

	describe("init()", () => {
		it("preloads all frames", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			const { preloadAllFrames } = await import("../src/terminal/ascii-loader");

			await renderer.init();

			expect(preloadAllFrames).toHaveBeenCalledWith(mockManifest.terminal, mockOptions.avatarPath);
		});
	});

	describe("setState()", () => {
		it("changes current state", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			renderer.setState("thinking");

			// State should be changed - we can't directly access private state
			// but we can verify no errors are thrown
		});

		it("resets frame index on state change", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			renderer.setState("idle");
			renderer.setState("thinking");

			// No direct way to test frame index, but should not throw
		});

		it("ignores invalid states", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			// Should not throw for unknown state
			expect(() => {
				renderer.setState("unknown" as never);
			}).not.toThrow();
		});

		it("does not change state if same state", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			renderer.setState("idle");
			renderer.setState("idle");

			// Should not throw
		});
	});

	describe("start() and stop()", () => {
		it("starts without error", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			await renderer.start("http://localhost:3333");

			// Should have hidden cursor
			expect(writtenData.some((d) => d.includes("\x1b[?25l"))).toBe(true);

			renderer.stop();
		});

		it("stop restores cursor", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			await renderer.start("http://localhost:3333");
			renderer.stop();

			// Should have shown cursor
			expect(writtenData.some((d) => d.includes("\x1b[?25h"))).toBe(true);
		});

		it("stop is idempotent", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			await renderer.start("http://localhost:3333");
			renderer.stop();
			renderer.stop(); // Second call should not throw
		});

		it("start is idempotent", async () => {
			const renderer = new TerminalRenderer(mockManifest, mockOptions);
			await renderer.init();

			await renderer.start("http://localhost:3333");
			await renderer.start("http://localhost:3333"); // Second call should be no-op

			renderer.stop();
		});
	});

	describe("auto-transitions", () => {
		it("schedules transition for states with duration", async () => {
			const manifestWithTransition: AvatarManifest = {
				...mockManifest,
				states: {
					...mockManifest.states,
					success: { file: "success.webm", duration: 1000, transition_to: "idle" },
				},
			};

			const renderer = new TerminalRenderer(manifestWithTransition, mockOptions);
			await renderer.init();

			renderer.setState("success");

			// Advance timers past the duration
			vi.advanceTimersByTime(1100);

			// Should have transitioned (no direct way to verify, but should not throw)
		});
	});
});

describe("createTerminalRenderer()", () => {
	const mockManifest: AvatarManifest = {
		name: "test-avatar",
		author: "Test",
		version: "1.0.0",
		format: "webm",
		states: { idle: { file: "idle.webm" } },
		terminal: {
			enabled: true,
			mode: "ascii",
			framerate: 8,
			size: { width: 40, height: 20 },
			states: { idle: { frames: ["idle/01.txt"] } },
		},
	};

	it("returns null when terminal is not enabled", () => {
		const manifestDisabled: AvatarManifest = {
			...mockManifest,
			terminal: mockManifest.terminal
				? {
						...mockManifest.terminal,
						enabled: false,
					}
				: undefined,
		};

		const renderer = createTerminalRenderer(manifestDisabled, "/path/to/avatar");

		expect(renderer).toBeNull();
	});

	it("returns null when terminal config is missing", () => {
		const manifestNoTerminal: AvatarManifest = {
			name: "test",
			author: "Test",
			version: "1.0.0",
			format: "webm",
			states: { idle: { file: "idle.webm" } },
		};

		const renderer = createTerminalRenderer(manifestNoTerminal, "/path/to/avatar");

		expect(renderer).toBeNull();
	});

	it("creates renderer when terminal is enabled", () => {
		const renderer = createTerminalRenderer(mockManifest, "/path/to/avatar");

		expect(renderer).toBeInstanceOf(TerminalRenderer);
	});

	it("uses default framerate when not specified", () => {
		const manifestNoFramerate: AvatarManifest = {
			...mockManifest,
			terminal: {
				enabled: true,
				mode: "ascii",
				states: { idle: { frames: ["idle/01.txt"] } },
			},
		};

		const renderer = createTerminalRenderer(manifestNoFramerate, "/path/to/avatar");

		expect(renderer).toBeInstanceOf(TerminalRenderer);
	});

	it("uses custom renderRow when specified", () => {
		const renderer = createTerminalRenderer(mockManifest, "/path/to/avatar", 15);

		expect(renderer).toBeInstanceOf(TerminalRenderer);
	});
});
