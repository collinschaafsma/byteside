import { beforeEach, describe, expect, it, vi } from "vitest";
import { setState } from "../plugins/state";
import type { WsPongMessage, WsStateMessage, WsWelcomeMessage } from "../src/types";

// Create mock peer factory
function createMockPeer() {
	return {
		send: vi.fn(),
		close: vi.fn(),
	};
}

type MockPeer = ReturnType<typeof createMockPeer>;

// Use vi.hoisted to ensure wsHandlers is defined before vi.mock runs
const { wsHandlers } = vi.hoisted(() => {
	return {
		wsHandlers: {
			current: null as null | {
				open?: (peer: MockPeer) => void;
				message?: (peer: MockPeer, msg: { text: () => string }) => void;
				close?: (peer: MockPeer) => void;
				error?: (peer: MockPeer, err: Error) => void;
			},
		},
	};
});

vi.mock("nitro/h3", () => ({
	defineWebSocketHandler: (handlers: NonNullable<typeof wsHandlers.current>) => {
		wsHandlers.current = handlers;
		return handlers;
	},
}));

// Import after mocking
import "../routes/_ws";

describe("WebSocket handler", () => {
	beforeEach(() => {
		setState("idle");
		vi.clearAllMocks();
	});

	describe("open()", () => {
		it("sends welcome message with current state", () => {
			const peer = createMockPeer();
			setState("thinking");

			wsHandlers.current?.open?.(peer);

			expect(peer.send).toHaveBeenCalledTimes(1);
			const message = JSON.parse(peer.send.mock.calls[0][0]) as WsWelcomeMessage;
			expect(message.type).toBe("welcome");
			expect(message.state).toBe("thinking");
			expect(typeof message.timestamp).toBe("number");
		});

		it("sends welcome message with idle state by default", () => {
			const peer = createMockPeer();
			setState("idle");

			wsHandlers.current?.open?.(peer);

			const message = JSON.parse(peer.send.mock.calls[0][0]) as WsWelcomeMessage;
			expect(message.type).toBe("welcome");
			expect(message.state).toBe("idle");
		});
	});

	describe("message()", () => {
		it("responds to ping with pong", () => {
			const peer = createMockPeer();
			wsHandlers.current?.open?.(peer);
			peer.send.mockClear();

			wsHandlers.current?.message?.(peer, { text: () => JSON.stringify({ type: "ping" }) });

			expect(peer.send).toHaveBeenCalledTimes(1);
			const message = JSON.parse(peer.send.mock.calls[0][0]) as WsPongMessage;
			expect(message.type).toBe("pong");
		});

		it("ignores invalid JSON", () => {
			const peer = createMockPeer();
			wsHandlers.current?.open?.(peer);
			peer.send.mockClear();

			expect(() => {
				wsHandlers.current?.message?.(peer, { text: () => "not json" });
			}).not.toThrow();

			expect(peer.send).not.toHaveBeenCalled();
		});

		it("ignores unknown message types", () => {
			const peer = createMockPeer();
			wsHandlers.current?.open?.(peer);
			peer.send.mockClear();

			wsHandlers.current?.message?.(peer, { text: () => JSON.stringify({ type: "unknown" }) });

			expect(peer.send).not.toHaveBeenCalled();
		});
	});

	describe("close()", () => {
		it("does not throw when closing", () => {
			const peer = createMockPeer();
			wsHandlers.current?.open?.(peer);

			expect(() => {
				wsHandlers.current?.close?.(peer);
			}).not.toThrow();
		});
	});

	describe("error()", () => {
		it("handles errors gracefully", () => {
			const peer = createMockPeer();
			wsHandlers.current?.open?.(peer);

			expect(() => {
				wsHandlers.current?.error?.(peer, new Error("Test error"));
			}).not.toThrow();
		});
	});

	describe("state broadcasts", () => {
		it("broadcasts state changes to connected peers", () => {
			const peer1 = createMockPeer();
			const peer2 = createMockPeer();

			// Connect both peers
			wsHandlers.current?.open?.(peer1);
			wsHandlers.current?.open?.(peer2);
			peer1.send.mockClear();
			peer2.send.mockClear();

			// Change state - this should broadcast to all peers
			setState("writing");

			expect(peer1.send).toHaveBeenCalledTimes(1);
			expect(peer2.send).toHaveBeenCalledTimes(1);

			const message1 = JSON.parse(peer1.send.mock.calls[0][0]) as WsStateMessage;
			const message2 = JSON.parse(peer2.send.mock.calls[0][0]) as WsStateMessage;

			expect(message1.type).toBe("state");
			expect(message1.state).toBe("writing");
			expect(message2.type).toBe("state");
			expect(message2.state).toBe("writing");
		});

		it("does not broadcast to disconnected peers", () => {
			const peer1 = createMockPeer();
			const peer2 = createMockPeer();

			// Connect both peers
			wsHandlers.current?.open?.(peer1);
			wsHandlers.current?.open?.(peer2);

			// Disconnect peer2
			wsHandlers.current?.close?.(peer2);

			peer1.send.mockClear();
			peer2.send.mockClear();

			// Change state
			setState("bash");

			expect(peer1.send).toHaveBeenCalledTimes(1);
			expect(peer2.send).not.toHaveBeenCalled();
		});

		it("continues broadcasting even if one peer throws", () => {
			const peer1 = createMockPeer();
			const peer2 = createMockPeer();
			const peer3 = createMockPeer();

			// Connect all peers
			wsHandlers.current?.open?.(peer1);
			wsHandlers.current?.open?.(peer2);
			wsHandlers.current?.open?.(peer3);

			// Make peer2 throw on send
			peer2.send.mockImplementation(() => {
				throw new Error("Connection lost");
			});

			peer1.send.mockClear();
			peer2.send.mockClear();
			peer3.send.mockClear();

			// Change state - should not throw and should still send to peer1 and peer3
			expect(() => setState("error")).not.toThrow();

			expect(peer1.send).toHaveBeenCalled();
			expect(peer2.send).toHaveBeenCalled(); // Called but threw
			expect(peer3.send).toHaveBeenCalled();
		});

		it("broadcasts multiple state changes in sequence", () => {
			const peer = createMockPeer();
			wsHandlers.current?.open?.(peer);
			peer.send.mockClear();

			setState("thinking");
			setState("writing");
			setState("success");

			expect(peer.send).toHaveBeenCalledTimes(3);

			const messages = peer.send.mock.calls.map((call) => JSON.parse(call[0]) as WsStateMessage);
			expect(messages[0].state).toBe("thinking");
			expect(messages[1].state).toBe("writing");
			expect(messages[2].state).toBe("success");
		});
	});
});
