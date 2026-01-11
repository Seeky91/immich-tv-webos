/**
 * Formats a timeline bucket date string (YYYY-MM-DD) into a human-readable format.
 * Returns "Today", "Yesterday", or a formatted date like "Monday, Dec 30, 2024".
 */
export const formatBucketDate = (timeBucket: string): string => {
	const [year, month, day] = timeBucket.split('-').map(Number);
	const date = new Date(year, month - 1, day);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const dateNormalized = new Date(date);
	dateNormalized.setHours(0, 0, 0, 0);

	if (dateNormalized.getTime() === today.getTime()) return 'Today';
	if (dateNormalized.getTime() === yesterday.getTime()) return 'Yesterday';

	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
};
