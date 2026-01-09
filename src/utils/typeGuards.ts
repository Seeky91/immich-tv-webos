import {APIError} from '../api/client';

/**
 * Type guard to check if an error is an APIError with a status code
 * @param error - Unknown error object
 * @returns True if error is APIError with status property
 */
export const isAPIError = (error: unknown): error is APIError => {
	return error instanceof APIError && typeof error.status === 'number';
};
