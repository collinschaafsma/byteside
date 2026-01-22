import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock h3 functions
const mockHeaders: Record<string, string> = {};
const mockEvent = {
	_handled: false,
	res: { statusCode: 200 },
	node: {
		req: {},
		res: { statusCode: 200, setHeader: vi.fn() },
	},
};

vi.mock("h3", () => ({
	createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
		const error = new Error(statusMessage) as Error & { statusCode: number };
		error.statusCode = statusCode;
		return error;
	},
	defineEventHandler: <T>(handler: T): T => handler,
	getRouterParam: vi.fn(),
	setHeader: vi.fn((_event, name, value) => {
		mockHeaders[name] = value;
	}),
}));

// Mock config - return empty avatarPaths since we mock resolveAvatarPath anyway
vi.mock("../src/config.js", () => ({
	loadBytesideConfig: vi.fn().mockResolvedValue({
		avatarPaths: [],
	}),
}));

// Mock avatar resolution
vi.mock("../src/avatar.js", async () => {
	const actual = await vi.importActual("../src/avatar.js");
	return {
		...actual,
		resolveAvatarPath: vi.fn(),
		getBundledAvatarsDir: vi.fn(),
	};
});

import { getRouterParam } from "h3";
import avatarRouteHandler from "../routes/avatars/[...path].get";
import { getBundledAvatarsDir, resolveAvatarPath } from "../src/avatar.js";

// Test directory setup - must be after imports due to vi.mock hoisting
const testDir = join(__dirname, ".test-avatar-route");

// Create test manifests
const testManifest = {
	name: "test-avatar",
	author: "Test",
	version: "1.0.0",
	format: "webm",
	states: { idle: { file: "idle.webm" } },
};

describe("GET /avatars/[...path]", () => {
	beforeAll(async () => {
		// Create test directory with avatar
		const avatarDir = join(testDir, "test-avatar");
		await mkdir(avatarDir, { recursive: true });
		await writeFile(join(avatarDir, "manifest.json"), JSON.stringify(testManifest));
		await writeFile(join(avatarDir, "idle.webm"), "fake video content");
	});

	afterAll(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	beforeEach(() => {
		vi.clearAllMocks();
		for (const key of Object.keys(mockHeaders)) {
			delete mockHeaders[key];
		}
	});

	it("serves manifest.json from custom avatar path", async () => {
		vi.mocked(getRouterParam).mockReturnValue("test-avatar/manifest.json");
		vi.mocked(resolveAvatarPath).mockResolvedValue(join(testDir, "test-avatar"));

		const result = await avatarRouteHandler(mockEvent);

		expect(result).toBeInstanceOf(Buffer);
		const content = JSON.parse(result.toString());
		expect(content.name).toBe("test-avatar");
		expect(mockHeaders["Content-Type"]).toBe("application/json");
	});

	it("serves video files with correct MIME type", async () => {
		vi.mocked(getRouterParam).mockReturnValue("test-avatar/idle.webm");
		vi.mocked(resolveAvatarPath).mockResolvedValue(join(testDir, "test-avatar"));

		const result = await avatarRouteHandler(mockEvent);

		expect(result).toBeInstanceOf(Buffer);
		expect(mockHeaders["Content-Type"]).toBe("video/webm");
	});

	it("falls back to bundled avatars when not in custom paths", async () => {
		const bundledDir = join(testDir, "bundled");
		const bundledAvatarDir = join(bundledDir, "default");
		await mkdir(bundledAvatarDir, { recursive: true });
		await writeFile(
			join(bundledAvatarDir, "manifest.json"),
			JSON.stringify({ ...testManifest, name: "default" }),
		);

		vi.mocked(getRouterParam).mockReturnValue("default/manifest.json");
		vi.mocked(resolveAvatarPath).mockResolvedValue(null);
		vi.mocked(getBundledAvatarsDir).mockReturnValue(bundledDir);

		const result = await avatarRouteHandler(mockEvent);

		expect(result).toBeInstanceOf(Buffer);
		const content = JSON.parse(result.toString());
		expect(content.name).toBe("default");

		await rm(bundledDir, { recursive: true, force: true });
	});

	it("returns 404 for non-existent avatar", async () => {
		vi.mocked(getRouterParam).mockReturnValue("nonexistent/manifest.json");
		vi.mocked(resolveAvatarPath).mockResolvedValue(null);
		vi.mocked(getBundledAvatarsDir).mockReturnValue("/nonexistent/bundled");

		await expect(avatarRouteHandler(mockEvent)).rejects.toMatchObject({
			statusCode: 404,
			message: "Avatar not found",
		});
	});

	it("returns 404 for non-existent file in valid avatar", async () => {
		vi.mocked(getRouterParam).mockReturnValue("test-avatar/nonexistent.webm");
		vi.mocked(resolveAvatarPath).mockResolvedValue(join(testDir, "test-avatar"));

		await expect(avatarRouteHandler(mockEvent)).rejects.toMatchObject({
			statusCode: 404,
			message: "File not found",
		});
	});

	it("returns 400 for missing path", async () => {
		vi.mocked(getRouterParam).mockReturnValue(undefined);

		await expect(avatarRouteHandler(mockEvent)).rejects.toMatchObject({
			statusCode: 400,
			message: "Missing path",
		});
	});

	it("returns 400 for invalid path format", async () => {
		vi.mocked(getRouterParam).mockReturnValue("invalid");

		await expect(avatarRouteHandler(mockEvent)).rejects.toMatchObject({
			statusCode: 400,
			message: "Invalid avatar path",
		});
	});

	it("rejects directory traversal in avatar name", async () => {
		vi.mocked(getRouterParam).mockReturnValue("../etc/passwd");

		await expect(avatarRouteHandler(mockEvent)).rejects.toMatchObject({
			statusCode: 400,
			message: "Invalid path",
		});
	});

	it("rejects directory traversal in file path", async () => {
		vi.mocked(getRouterParam).mockReturnValue("test-avatar/../../../etc/passwd");

		await expect(avatarRouteHandler(mockEvent)).rejects.toMatchObject({
			statusCode: 400,
			message: "Invalid path",
		});
	});

	it("sets cache headers", async () => {
		vi.mocked(getRouterParam).mockReturnValue("test-avatar/manifest.json");
		vi.mocked(resolveAvatarPath).mockResolvedValue(join(testDir, "test-avatar"));

		await avatarRouteHandler(mockEvent);

		expect(mockHeaders["Cache-Control"]).toBe("public, max-age=3600");
	});
});
