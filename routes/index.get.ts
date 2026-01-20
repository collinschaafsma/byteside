import { defineHandler, setResponseHeader } from "nitro/h3";

/**
 * GET / - Serves placeholder HTML page for the avatar viewer.
 */
export default defineHandler((event) => {
	setResponseHeader(event, "Content-Type", "text/html");

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>byteside viewer</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			background: #1a1a2e;
			color: #eee;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}

		h1 {
			font-size: 2rem;
			margin-bottom: 1rem;
			color: #8b5cf6;
		}

		.state-container {
			background: #16213e;
			padding: 2rem 3rem;
			border-radius: 12px;
			text-align: center;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		}

		.state-label {
			font-size: 0.875rem;
			color: #888;
			text-transform: uppercase;
			letter-spacing: 0.1em;
			margin-bottom: 0.5rem;
		}

		.state-value {
			font-size: 3rem;
			font-weight: bold;
			color: #8b5cf6;
			transition: color 0.3s ease;
		}

		.state-value.thinking { color: #f59e0b; }
		.state-value.writing { color: #10b981; }
		.state-value.bash { color: #3b82f6; }
		.state-value.error { color: #ef4444; }
		.state-value.success { color: #22c55e; }
		.state-value.waiting { color: #a855f7; }

		.timestamp {
			margin-top: 1rem;
			font-size: 0.75rem;
			color: #666;
		}

		.placeholder-note {
			margin-top: 2rem;
			font-size: 0.875rem;
			color: #666;
			max-width: 300px;
			text-align: center;
			line-height: 1.5;
		}
	</style>
</head>
<body>
	<div class="state-container">
		<h1>byteside viewer</h1>
		<div class="state-label">Current State</div>
		<div id="state" class="state-value">loading...</div>
		<div id="timestamp" class="timestamp"></div>
	</div>
	<p class="placeholder-note">
		This is a placeholder viewer. Animated avatar coming soon!
	</p>

	<script>
		const stateEl = document.getElementById("state");
		const timestampEl = document.getElementById("timestamp");

		async function fetchState() {
			try {
				const res = await fetch("/state");
				const data = await res.json();

				stateEl.textContent = data.state;
				stateEl.className = "state-value " + data.state;

				const date = new Date(data.timestamp);
				timestampEl.textContent = "Updated: " + date.toLocaleTimeString();
			} catch (err) {
				stateEl.textContent = "error";
				stateEl.className = "state-value error";
				timestampEl.textContent = "Failed to fetch state";
			}
		}

		// Initial fetch
		fetchState();

		// Poll every 2 seconds
		setInterval(fetchState, 2000);
	</script>
</body>
</html>`;
});
