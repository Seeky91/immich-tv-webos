import {APIError} from '../api/client';

export function presentError(err: unknown): string {
	if (err instanceof APIError) {
		if (err.status === 401) return 'Please sign in again.';
		if (err.status === 403) return 'Access denied.';
		if (err.status === 404) return 'Content not found.';
		if (err.status && err.status >= 500) return 'Server unavailable. Please try again later.';
		if (!err.status) return 'Unable to reach the server.';
	}
	return 'Something went wrong.';
}
