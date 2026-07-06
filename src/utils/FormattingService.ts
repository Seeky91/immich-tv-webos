// Immich servers before v3 send asset durations as "H:MM:SS.mmm" strings; v3+ sends
// milliseconds. Normalize both to seconds at the API boundary.
export function toDurationSeconds(duration: string | number | null | undefined): number | null {
	if (duration == null) return null;
	if (typeof duration === 'number') return duration / 1000;
	const [hStr, mStr, sStr] = duration.split(':');
	if (!hStr || !mStr || !sStr) return null;
	return parseInt(hStr, 10) * 3600 + parseInt(mStr, 10) * 60 + parseFloat(sStr);
}

export function formatDuration(durationSeconds: number): string {
	const total = Math.floor(durationSeconds);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;

	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
		: `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatBucketDate(timeBucket: string): string {
	const [year, month, day] = timeBucket.split('-').map(Number);
	if (year === undefined || month === undefined || day === undefined) return timeBucket;
	const date = new Date(year, month - 1, day);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const dateNormalized = new Date(date);
	dateNormalized.setHours(0, 0, 0, 0);

	if (dateNormalized.getTime() === today.getTime()) return 'Today';
	if (dateNormalized.getTime() === yesterday.getTime()) return 'Yesterday';

	return date.toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'});
}
