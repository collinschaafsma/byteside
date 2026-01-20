import { defineHandler } from "nitro/h3";
import { useRuntimeConfig } from "nitro/runtime-config";

/**
 * Response type for GET /config endpoint.
 */
export interface ConfigResponse {
	avatar: string;
}

/**
 * GET /config - Returns the current runtime configuration.
 */
export default defineHandler((): ConfigResponse => {
	const config = useRuntimeConfig();
	return {
		avatar: (config.public?.avatar as string) || "default",
	};
});
