import { defineHandler } from "nitro/h3";
import { getState } from "../plugins/state";
import type { StateResponse } from "../src/types";

/**
 * GET /state - Returns the current avatar state.
 */
export default defineHandler((): StateResponse => {
	return getState();
});
