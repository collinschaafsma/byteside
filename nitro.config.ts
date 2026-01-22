import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
	preset: "node-server",
	compatibilityDate: "2025-01-19",
	serverDir: ".",
	scanDirs: ["."],
	experimental: {
		websocket: true,
	},
	typescript: {
		strict: true,
	},
	runtimeConfig: {
		public: {
			avatar: "default",
		},
	},
});
