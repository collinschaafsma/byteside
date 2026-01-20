import { defineHandler, readBody, setResponseStatus } from "nitro/h3";
import { isValidState, setState, VALID_STATES } from "../plugins/state";
import type { AvatarState, StateUpdate } from "../src/types";

interface StatePostResponse {
	ok: true;
	state: AvatarState;
	previous: AvatarState;
}

interface StatePostError {
	ok: false;
	error: string;
	validStates: readonly AvatarState[];
}

/**
 * POST /state - Updates the avatar state.
 */
export default defineHandler(async (event): Promise<StatePostResponse | StatePostError> => {
	const body = await readBody<StateUpdate>(event);

	if (!body || !isValidState(body.state)) {
		setResponseStatus(event, 400);
		return {
			ok: false,
			error: `Invalid state. Must be one of: ${VALID_STATES.join(", ")}`,
			validStates: VALID_STATES,
		};
	}

	const previous = setState(body.state);

	return {
		ok: true,
		state: body.state,
		previous,
	};
});
