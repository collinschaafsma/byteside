/**
 * byteside viewer - WebSocket client for real-time avatar state display
 */
(() => {
	// DOM elements
	const avatarContainer = document.getElementById("avatar-container");
	const videoA = document.getElementById("avatar-video-a");
	const videoB = document.getElementById("avatar-video-b");
	const stateLabel = document.getElementById("state-label");
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
	let manifest = null;
	let transitionTimeout = null;
	let activeVideo = videoA;
	let inactiveVideo = videoB;
	const preloadedVideos = {};

	// Constants
	const INITIAL_RECONNECT_DELAY = 2000;
	const MAX_RECONNECT_DELAY = 30000;
	const PING_INTERVAL = 30000;
	const CROSSFADE_DURATION = 300; // ms, should match CSS transition

	// Config (loaded from server)
	let avatarName = "default";

	/**
	 * Build WebSocket URL based on current location
	 */
	function getWsUrl() {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/_ws`;
	}

	/**
	 * Load config from server
	 */
	async function loadConfig() {
		try {
			const response = await fetch("/config");
			if (!response.ok) {
				console.warn("[byteside] Failed to load config, using default avatar");
				return;
			}
			const config = await response.json();
			if (config.avatar) {
				avatarName = config.avatar;
				console.log("[byteside] Loaded config, avatar:", avatarName);
			}
		} catch (err) {
			console.warn("[byteside] Failed to load config:", err);
		}
	}

	/**
	 * Load avatar manifest
	 */
	async function loadManifest() {
		try {
			const response = await fetch(`/avatars/${avatarName}/manifest.json`);
			if (!response.ok) {
				throw new Error(`Failed to load manifest: ${response.status}`);
			}
			manifest = await response.json();
			console.log("[byteside] Loaded manifest:", manifest.name);
			return true;
		} catch (err) {
			console.error("[byteside] Failed to load manifest:", err);
			return false;
		}
	}

	/**
	 * Preload all avatar videos
	 */
	async function preloadVideos() {
		if (!manifest || !manifest.states) return;

		const states = Object.keys(manifest.states);
		console.log(`[byteside] Preloading ${states.length} videos...`);

		const promises = states.map((state) => {
			return new Promise((resolve) => {
				const stateConfig = manifest.states[state];
				const url = `/avatars/${avatarName}/${stateConfig.file}`;

				// Create a video element for preloading
				const video = document.createElement("video");
				video.muted = true;
				video.playsInline = true;
				video.preload = "auto";

				video.oncanplaythrough = () => {
					preloadedVideos[state] = url;
					console.log(`[byteside] Preloaded: ${state}`);
					resolve();
				};

				video.onerror = () => {
					console.warn(`[byteside] Failed to preload: ${state}`);
					preloadedVideos[state] = url; // Still store URL for fallback
					resolve();
				};

				video.src = url;
				video.load();
			});
		});

		await Promise.all(promises);
		console.log("[byteside] All videos preloaded");
	}

	/**
	 * Get video URL for a state
	 */
	function getVideoUrl(state) {
		// Use preloaded URL if available
		if (preloadedVideos[state]) {
			return preloadedVideos[state];
		}

		// Fallback to constructing URL
		if (!manifest || !manifest.states[state]) {
			state = "idle";
		}
		const stateConfig = manifest.states[state];
		if (!stateConfig) return null;
		return `/avatars/${avatarName}/${stateConfig.file}`;
	}

	/**
	 * Get state configuration
	 */
	function getStateConfig(state) {
		if (!manifest || !manifest.states[state]) {
			return manifest?.states?.idle || null;
		}
		return manifest.states[state];
	}

	/**
	 * Crossfade to a new video
	 */
	function crossfadeTo(state) {
		const videoUrl = getVideoUrl(state);
		if (!videoUrl) return;

		const stateConfig = getStateConfig(state);

		// Clear any pending transition
		if (transitionTimeout) {
			clearTimeout(transitionTimeout);
			transitionTimeout = null;
		}

		// Set up the inactive video with the new source
		inactiveVideo.src = videoUrl;

		// Handle looping based on manifest settings and state config
		const isOneShot = stateConfig?.duration !== undefined;
		inactiveVideo.loop = !isOneShot && (manifest?.loop ?? true);

		// Wait for video to be ready, then crossfade
		const onCanPlay = () => {
			inactiveVideo.removeEventListener("canplay", onCanPlay);

			// Start playing the new video
			inactiveVideo.play().catch((err) => {
				console.error("[byteside] Failed to play video:", err);
			});

			// Crossfade: activate new, deactivate old
			inactiveVideo.classList.add("active");
			activeVideo.classList.remove("active");

			// Swap references
			const temp = activeVideo;
			activeVideo = inactiveVideo;
			inactiveVideo = temp;

			// Pause the old video after crossfade completes
			setTimeout(() => {
				inactiveVideo.pause();
			}, CROSSFADE_DURATION);
		};

		inactiveVideo.addEventListener("canplay", onCanPlay);
		inactiveVideo.load();

		// Handle one-shot states with transitions
		if (isOneShot && stateConfig.transition_to) {
			transitionTimeout = setTimeout(() => {
				updateStateDisplay(stateConfig.transition_to);
			}, stateConfig.duration);
		}
	}

	/**
	 * Play initial video (no crossfade)
	 */
	function playInitialVideo(state) {
		const videoUrl = getVideoUrl(state);
		if (!videoUrl) return;

		const stateConfig = getStateConfig(state);
		const isOneShot = stateConfig?.duration !== undefined;

		activeVideo.src = videoUrl;
		activeVideo.loop = !isOneShot && (manifest?.loop ?? true);
		activeVideo.classList.add("active");

		activeVideo.play().catch((err) => {
			console.error("[byteside] Failed to play initial video:", err);
		});
	}

	/**
	 * Update the main state display
	 */
	function updateStateDisplay(state) {
		if (state === currentState) return;

		previousState = currentState;
		currentState = state;

		avatarContainer.dataset.state = state;
		stateLabel.textContent = state.toUpperCase();

		// Crossfade to the new state video
		crossfadeTo(state);

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
			avatarContainer.classList.add("disconnected");
		} else {
			avatarContainer.classList.remove("disconnected");
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
	async function init() {
		// Load config first to get avatar name
		await loadConfig();

		// Load manifest
		const loaded = await loadManifest();
		if (!loaded) {
			console.error("[byteside] Cannot start without manifest");
			return;
		}

		// Preload all videos for smooth transitions
		await preloadVideos();

		// Play initial idle state (no crossfade)
		playInitialVideo("idle");

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
