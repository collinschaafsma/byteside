/**
 * Valid avatar states representing the AI agent's current activity.
 */
export type AvatarState =
	| "idle"
	| "thinking"
	| "writing"
	| "bash"
	| "error"
	| "success"
	| "waiting";

/**
 * Request body for POST /state endpoint.
 */
export interface StateUpdate {
	state: AvatarState;
}

/**
 * Response from GET /state endpoint.
 */
export interface StateResponse {
	state: AvatarState;
	timestamp: number;
}
