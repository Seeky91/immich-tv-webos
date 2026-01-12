abstract class FormattingService {

	public static formatDuration(duration: string): string {
		const parts = duration.split(':');
		if (parts.length < 3) return '';

		const hours = parseInt(parts[0], 10);
		const minutes = parseInt(parts[1], 10);
		const seconds = Math.floor(parseFloat(parts[2]));

		return hours > 0
			? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
			: `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	public static formatBucketDate(timeBucket: string): string {
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

		return date.toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'});
	}
}

export default FormattingService;
