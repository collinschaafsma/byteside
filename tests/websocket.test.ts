import { beforeEach, describe, expect, it, vi } from "vitest";
import { onStateChange, setState } from "../plugins/state";
import type { AvatarState } from "../src/types";

describe("state change listeners", () => {
	beforeEach(() => {
		// Reset to idle state before each test
		setState("idle");
	});

	it("notifies listeners when state changes", () => {
		const listener = vi.fn();
		onStateChange(listener);

		setState("thinking");

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith("thinking", expect.any(Number));
	});

	it("allows unsubscribing", () => {
		const listener = vi.fn();
		const unsubscribe = onStateChange(listener);

		setState("writing");
		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();

		setState("bash");
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("supports multiple listeners", () => {
		const listener1 = vi.fn();
		const listener2 = vi.fn();
		const listener3 = vi.fn();

		onStateChange(listener1);
		onStateChange(listener2);
		onStateChange(listener3);

		setState("success");

		expect(listener1).toHaveBeenCalledWith("success", expect.any(Number));
		expect(listener2).toHaveBeenCalledWith("success", expect.any(Number));
		expect(listener3).toHaveBeenCalledWith("success", expect.any(Number));
	});

	it("continues with other listeners if one throws", () => {
		const listener1 = vi.fn();
		const errorListener = vi.fn(() => {
			throw new Error("Test error");
		});
		const listener2 = vi.fn();

		onStateChange(listener1);
		onStateChange(errorListener);
		onStateChange(listener2);

		// Should not throw
		expect(() => setState("error")).not.toThrow();

		// All listeners should have been called
		expect(listener1).toHaveBeenCalled();
		expect(errorListener).toHaveBeenCalled();
		expect(listener2).toHaveBeenCalled();
	});

	it("passes correct state and timestamp to listeners", () => {
		const listener = vi.fn();
		onStateChange(listener);

		const before = Date.now();
		setState("waiting");
		const after = Date.now();

		const [state, timestamp] = listener.mock.calls[0] as [AvatarState, number];
		expect(state).toBe("waiting");
		expect(timestamp).toBeGreaterThanOrEqual(before);
		expect(timestamp).toBeLessThanOrEqual(after);
	});
});
