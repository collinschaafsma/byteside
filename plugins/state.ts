import { definePlugin } from "nitro";
import type { AvatarState, StateResponse } from "../src/types";

/**
 * Listener function type for state changes.
 */
export type StateChangeListener = (state: AvatarState, timestamp: number) => void;

/**
 * In-memory state manager for the avatar.
 * Stores the current state and timestamp.
 */
let currentState: AvatarState = "idle";
let stateTimestamp: number = Date.now();

/**
 * Set of listeners to notify when state changes.
 */
const listeners = new Set<StateChangeListener>();

/**
 * Notify all listeners of a state change.
 * Errors in listeners are logged but don't stop other listeners.
 */
function notifyListeners(): void {
	for (const listener of listeners) {
		try {
			listener(currentState, stateTimestamp);
		} catch (err) {
			console.error("[byteside] Error in state change listener:", err);
		}
	}
}

/**
 * Register a listener for state changes.
 * @returns Unsubscribe function to remove the listener.
 */
export function onStateChange(listener: StateChangeListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Get the current avatar state.
 */
export function getState(): StateResponse {
	return {
		state: currentState,
		timestamp: stateTimestamp,
	};
}

/**
 * Set the avatar state.
 * @returns The previous state.
 */
export function setState(newState: AvatarState): AvatarState {
	const previous = currentState;
	currentState = newState;
	stateTimestamp = Date.now();
	notifyListeners();
	return previous;
}

/**
 * Valid avatar states for validation.
 */
export const VALID_STATES: readonly AvatarState[] = [
	"idle",
	"thinking",
	"writing",
	"bash",
	"error",
	"success",
	"waiting",
] as const;

/**
 * Check if a string is a valid avatar state.
 */
export function isValidState(state: unknown): state is AvatarState {
	return typeof state === "string" && VALID_STATES.includes(state as AvatarState);
}

export default definePlugin(() => {
	// Plugin initializes the state module
	console.log("[byteside] State manager initialized with idle state");
});
