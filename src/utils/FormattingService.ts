export function formatDuration(duration: string): string {
	const [hStr, mStr, sStr] = duration.split(':');
	if (!hStr || !mStr || !sStr) return '';

	const hours = parseInt(hStr, 10);
	const minutes = parseInt(mStr, 10);
	const seconds = Math.floor(parseFloat(sStr));

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
