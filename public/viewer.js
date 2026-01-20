/**
 * byteside viewer - WebSocket client for real-time avatar state display
 */
(() => {
	// DOM elements
	const stateDisplay = document.getElementById("state-display");
	const stateText = stateDisplay.querySelector(".state-text");
	const debugPanel = document.getElementById("debug-panel");
	const connectionIndicator = document.getElementById("connection-indicator");

	// Debug elements
	const debugConnection = document.getElementById("debug-connection");
	const debugState = document.getElementById("debug-state");
	const debugPrevious = document.getElementById("debug-previous");
	const debugTimestamp = document.getElementById("debug-timestamp");

	// State
	let ws = null;
	let currentState = "idle";
	let previousState = null;
	let reconnectAttempts = 0;
	let reconnectTimeout = null;
	let pingInterval = null;

	// Constants
	const INITIAL_RECONNECT_DELAY = 2000;
	const MAX_RECONNECT_DELAY = 30000;
	const PING_INTERVAL = 30000;

	/**
	 * Build WebSocket URL based on current location
	 */
	function getWsUrl() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/_ws`;
	}

	/**
	 * Update the main state display
	 */
	function updateStateDisplay(state) {
		previousState = currentState;
		currentState = state;

		stateDisplay.dataset.state = state;
		stateText.textContent = state.toUpperCase();

		// Update debug info
		debugState.textContent = state;
		debugPrevious.textContent = previousState || "-";
	}

	/**
	 * Update connection status
	 */
	function updateConnectionStatus(status) {
		connectionIndicator.dataset.status = status;
		debugConnection.textContent = status;

		if (status === "disconnected") {
			stateDisplay.classList.add("disconnected");
		} else {
			stateDisplay.classList.remove("disconnected");
		}
	}

	/**
	 * Update timestamp display
	 */
	function updateTimestamp(timestamp) {
		const date = new Date(timestamp);
		debugTimestamp.textContent = date.toLocaleTimeString();
	}

	/**
	 * Calculate reconnect delay with exponential backoff
	 */
	function getReconnectDelay() {
		const delay = Math.min(INITIAL_RECONNECT_DELAY * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
		return delay;
	}

	/**
	 * Start ping interval for keepalive
	 */
	function startPing() {
		stopPing();
		pingInterval = setInterval(() => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "ping" }));
			}
		}, PING_INTERVAL);
	}

	/**
	 * Stop ping interval
	 */
	function stopPing() {
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}
	}

	/**
	 * Handle incoming WebSocket message
	 */
	function handleMessage(event) {
		try {
			const msg = JSON.parse(event.data);

			switch (msg.type) {
				case "welcome":
					updateStateDisplay(msg.state);
					updateTimestamp(msg.timestamp);
					break;

				case "state":
					updateStateDisplay(msg.state);
					updateTimestamp(msg.timestamp);
					break;

				case "pong":
					// Keepalive response received
					break;
			}
		} catch (err) {
			console.error("[byteside] Failed to parse message:", err);
		}
	}

	/**
	 * Connect to WebSocket server
	 */
	function connect() {
		if (ws && ws.readyState === WebSocket.OPEN) {
			return;
		}

		updateConnectionStatus("connecting");

		try {
			ws = new WebSocket(getWsUrl());

			ws.onopen = () => {
				console.log("[byteside] Connected to server");
				updateConnectionStatus("connected");
				reconnectAttempts = 0;
				startPing();
			};

			ws.onmessage = handleMessage;

			ws.onclose = () => {
				console.log("[byteside] Disconnected from server");
				updateConnectionStatus("disconnected");
				stopPing();
				scheduleReconnect();
			};

			ws.onerror = (err) => {
				console.error("[byteside] WebSocket error:", err);
			};
		} catch (err) {
			console.error("[byteside] Failed to connect:", err);
			updateConnectionStatus("disconnected");
			scheduleReconnect();
		}
	}

	/**
	 * Schedule a reconnection attempt
	 */
	function scheduleReconnect() {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
		}

		const delay = getReconnectDelay();
		reconnectAttempts++;

		console.log(`[byteside] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
		updateConnectionStatus("reconnecting");

		reconnectTimeout = setTimeout(connect, delay);
	}

	/**
	 * Toggle debug panel visibility
	 */
	function toggleDebugPanel() {
		debugPanel.classList.toggle("hidden");
	}

	/**
	 * Initialize the viewer
	 */
	function init() {
		// Toggle debug panel with 'D' key
		document.addEventListener("keydown", (e) => {
			if (e.key === "d" || e.key === "D") {
				// Don't toggle if user is typing in an input
				if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
					return;
				}
				toggleDebugPanel();
			}
		});

		// Also toggle on click of connection indicator
		connectionIndicator.addEventListener("click", toggleDebugPanel);

		// Start connection
		connect();
	}

	// Start when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
