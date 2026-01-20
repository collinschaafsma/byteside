import { beforeEach, describe, expect, it, vi } from "vitest";
import { setState } from "../plugins/state";

// Mock nitro/h3 functions
const mockEvent = () => ({
	_handled: false,
	res: {
		statusCode: 200,
	},
	node: {
		req: {},
		res: {
			statusCode: 200,
			setHeader: vi.fn(),
		},
	},
});

vi.mock("nitro/h3", () => ({
	defineHandler: <T>(handler: T): T => handler,
	readBody: vi.fn(),
	setResponseStatus: vi.fn((event, status) => {
		event.res.statusCode = status;
	}),
	setResponseHeader: vi.fn(),
}));

import { readBody, setResponseStatus } from "nitro/h3";
// Import handlers after mocking
import getStateHandler from "../routes/state.get";
import postStateHandler from "../routes/state.post";

describe("API routes", () => {
	beforeEach(() => {
		setState("idle");
		vi.clearAllMocks();
	});

	describe("GET /state", () => {
		it("returns 200 with state and timestamp", () => {
			const result = getStateHandler();

			expect(result).toHaveProperty("state");
			expect(result).toHaveProperty("timestamp");
			expect(result.state).toBe("idle");
			expect(typeof result.timestamp).toBe("number");
		});

		it("returns the current state", () => {
			setState("thinking");
			const result = getStateHandler();

			expect(result.state).toBe("thinking");
		});
	});

	describe("POST /state", () => {
		it("updates state with valid input and returns 200", async () => {
			const event = mockEvent();
			vi.mocked(readBody).mockResolvedValue({ state: "writing" });

			const result = await postStateHandler(event);

			expect(result).toEqual({
				ok: true,
				state: "writing",
				previous: "idle",
			});
			expect(setResponseStatus).not.toHaveBeenCalled();
		});

		it("returns 400 for invalid state", async () => {
			const event = mockEvent();
			vi.mocked(readBody).mockResolvedValue({ state: "invalid" });

			const result = await postStateHandler(event);

			expect(result.ok).toBe(false);
			expect(result).toHaveProperty("error");
			expect(result).toHaveProperty("validStates");
			expect(setResponseStatus).toHaveBeenCalledWith(event, 400);
		});

		it("returns 400 for missing body", async () => {
			const event = mockEvent();
			vi.mocked(readBody).mockResolvedValue(null);

			const result = await postStateHandler(event);

			expect(result.ok).toBe(false);
			expect(setResponseStatus).toHaveBeenCalledWith(event, 400);
		});

		it("returns 400 for missing state field", async () => {
			const event = mockEvent();
			vi.mocked(readBody).mockResolvedValue({});

			const result = await postStateHandler(event);

			expect(result.ok).toBe(false);
			expect(setResponseStatus).toHaveBeenCalledWith(event, 400);
		});

		it("transitions through multiple states correctly", async () => {
			const event = mockEvent();

			vi.mocked(readBody).mockResolvedValue({ state: "thinking" });
			let result = await postStateHandler(event);
			expect(result).toEqual({ ok: true, state: "thinking", previous: "idle" });

			vi.mocked(readBody).mockResolvedValue({ state: "writing" });
			result = await postStateHandler(event);
			expect(result).toEqual({
				ok: true,
				state: "writing",
				previous: "thinking",
			});

			vi.mocked(readBody).mockResolvedValue({ state: "success" });
			result = await postStateHandler(event);
			expect(result).toEqual({
				ok: true,
				state: "success",
				previous: "writing",
			});
		});
	});
});
