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

/**
 * WebSocket message sent on initial connection.
 */
export interface WsWelcomeMessage {
	type: "welcome";
	state: AvatarState;
	timestamp: number;
}

/**
 * WebSocket message sent when state changes.
 */
export interface WsStateMessage {
	type: "state";
	state: AvatarState;
	timestamp: number;
}

/**
 * WebSocket ping message for health checks.
 */
export interface WsPingMessage {
	type: "ping";
}

/**
 * WebSocket pong response message.
 */
export interface WsPongMessage {
	type: "pong";
}

/**
 * Union type of all WebSocket messages.
 */
export type WsMessage = WsWelcomeMessage | WsStateMessage | WsPingMessage | WsPongMessage;
