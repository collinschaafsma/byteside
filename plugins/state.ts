import { definePlugin } from "nitro";
import type { AvatarState, StateResponse } from "../src/types";

/**
 * In-memory state manager for the avatar.
 * Stores the current state and timestamp.
 */
let currentState: AvatarState = "idle";
let stateTimestamp: number = Date.now();

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
