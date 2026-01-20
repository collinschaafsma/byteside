import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			include: ["plugins/**/*.ts", "routes/**/*.ts", "src/**/*.ts"],
		},
	},
});
