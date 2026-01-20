import { defineWebSocketHandler, type Peer } from "nitro/h3";
import { getState, onStateChange } from "../plugins/state";
import type { WsPongMessage, WsStateMessage, WsWelcomeMessage } from "../src/types";

/**
 * Set of connected WebSocket peers.
 */
const peers = new Set<Peer>();

/**
 * Broadcast a message to all connected peers.
 */
function broadcast(message: WsStateMessage): void {
	const data = JSON.stringify(message);
	for (const peer of peers) {
		try {
			peer.send(data);
		} catch (err) {
			console.error("[byteside] Error sending to peer:", err);
		}
	}
}

// Register state change listener at module load
onStateChange((state, timestamp) => {
	const message: WsStateMessage = {
		type: "state",
		state,
		timestamp,
	};
	broadcast(message);
});

/**
 * WebSocket handler for real-time avatar state updates.
 * Endpoint: /_ws
 */
export default defineWebSocketHandler({
	open(peer) {
		peers.add(peer);
		console.log(`[byteside] WebSocket client connected (${peers.size} total)`);

		// Send welcome message with current state
		const { state, timestamp } = getState();
		const welcome: WsWelcomeMessage = {
			type: "welcome",
			state,
			timestamp,
		};
		peer.send(JSON.stringify(welcome));
	},

	message(peer, msg) {
		try {
			const data = JSON.parse(msg.text());
			if (data.type === "ping") {
				const pong: WsPongMessage = { type: "pong" };
				peer.send(JSON.stringify(pong));
			}
		} catch {
			// Ignore invalid messages
		}
	},

	close(peer) {
		peers.delete(peer);
		console.log(`[byteside] WebSocket client disconnected (${peers.size} remaining)`);
	},

	error(peer, err) {
		console.error("[byteside] WebSocket error:", err);
		peers.delete(peer);
	},
});
