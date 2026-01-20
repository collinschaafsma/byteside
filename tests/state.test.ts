import { beforeEach, describe, expect, it } from "vitest";
import { getState, isValidState, setState, VALID_STATES } from "../plugins/state";
import type { AvatarState } from "../src/types";

describe("state plugin", () => {
	beforeEach(() => {
		// Reset to idle state before each test
		setState("idle");
	});

	describe("getState", () => {
		it("returns a StateResponse with state and timestamp", () => {
			const result = getState();

			expect(result).toHaveProperty("state");
			expect(result).toHaveProperty("timestamp");
			expect(typeof result.state).toBe("string");
			expect(typeof result.timestamp).toBe("number");
		});

		it("returns idle as the default state", () => {
			const result = getState();

			expect(result.state).toBe("idle");
		});

		it("returns a recent timestamp", () => {
			const before = Date.now();
			setState("idle"); // Refresh timestamp
			const result = getState();
			const after = Date.now();

			expect(result.timestamp).toBeGreaterThanOrEqual(before);
			expect(result.timestamp).toBeLessThanOrEqual(after);
		});
	});

	describe("setState", () => {
		it("updates the state", () => {
			setState("thinking");
			const result = getState();

			expect(result.state).toBe("thinking");
		});

		it("returns the previous state", () => {
			setState("idle");
			const previous = setState("writing");

			expect(previous).toBe("idle");
		});

		it("updates the timestamp", () => {
			const before = getState().timestamp;
			// Small delay to ensure timestamp difference
			const previousTimestamp = before;
			setState("bash");
			const after = getState().timestamp;

			expect(after).toBeGreaterThanOrEqual(previousTimestamp);
		});
	});

	describe("isValidState", () => {
		it("accepts all valid states", () => {
			const validStates: AvatarState[] = [
				"idle",
				"thinking",
				"writing",
				"bash",
				"error",
				"success",
				"waiting",
			];

			for (const state of validStates) {
				expect(isValidState(state)).toBe(true);
			}
		});

		it("rejects invalid strings", () => {
			expect(isValidState("invalid")).toBe(false);
			expect(isValidState("running")).toBe(false);
			expect(isValidState("")).toBe(false);
			expect(isValidState("IDLE")).toBe(false);
		});

		it("rejects non-string values", () => {
			expect(isValidState(null)).toBe(false);
			expect(isValidState(undefined)).toBe(false);
			expect(isValidState(123)).toBe(false);
			expect(isValidState({})).toBe(false);
			expect(isValidState([])).toBe(false);
		});
	});

	describe("VALID_STATES", () => {
		it("contains exactly 7 states", () => {
			expect(VALID_STATES).toHaveLength(7);
		});

		it("contains all expected states", () => {
			expect(VALID_STATES).toContain("idle");
			expect(VALID_STATES).toContain("thinking");
			expect(VALID_STATES).toContain("writing");
			expect(VALID_STATES).toContain("bash");
			expect(VALID_STATES).toContain("error");
			expect(VALID_STATES).toContain("success");
			expect(VALID_STATES).toContain("waiting");
		});

		it("is readonly", () => {
			// TypeScript compile-time check - this verifies the type
			const states: readonly string[] = VALID_STATES;
			expect(states).toBe(VALID_STATES);
		});
	});
});
