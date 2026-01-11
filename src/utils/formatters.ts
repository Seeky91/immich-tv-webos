/**
 * Formats a duration string (HH:MM:SS.mmm) into a human-readable format.
 * Returns format like "1:23:45" for hours or "5:30" for minutes/seconds only.
 */
export const formatDuration = (duration: string): string => {
	const parts = duration.split(':');
	if (parts.length < 2) return '';

	const hours = parseInt(parts[0], 10);
	const minutes = parseInt(parts[1], 10);
	const seconds = Math.floor(parseFloat(parts[2]));

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
