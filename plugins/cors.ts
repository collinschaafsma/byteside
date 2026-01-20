import { definePlugin } from "nitro";
import { setResponseHeaders } from "nitro/h3";

/**
 * CORS middleware plugin for local development.
 * Adds permissive CORS headers to all responses.
 */
export default definePlugin((nitroApp) => {
	nitroApp.hooks.hook("request", (event) => {
		// Set CORS headers on all requests
		setResponseHeaders(event, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		});

		// Handle preflight OPTIONS requests
		if (event.method === "OPTIONS") {
			event.node.res.statusCode = 204;
			event.node.res.end();
			return;
		}
	});

	console.log("[byteside] CORS middleware enabled");
});
