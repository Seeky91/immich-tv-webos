import {APIError} from '../api/client';
import {AuthMethod} from '../api/types';

const NETWORK_ERROR_MESSAGE =
	"Couldn't reach the server. Verify the URL and that your Immich server allows requests from this app (CORS).";

export function makeAuthErrorMessage(error: unknown, method: AuthMethod): string {
	if (error instanceof APIError) {
		if (error.status === 401) {
			return method === AuthMethod.API_KEY ? 'Invalid API key' : 'Invalid email or password';
		}
		if (error.status) return `Server returned ${error.status}`;
	}
	return NETWORK_ERROR_MESSAGE;
}
