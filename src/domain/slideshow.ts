import {monthKey} from './transforms';
import type {PhotoRepository} from './PhotoRepository';
import type {DayGroup, TimelineAsset, TimelineBucket, TimelineScope} from './types';

export type SlideshowOrder = 'sequential' | 'shuffle';

// Next batch of candidates; null means the source is exhausted for good.
type BatchSource = () => Promise<TimelineAsset[] | null>;

const HISTORY_LIMIT = 500;
const RANDOM_BATCH_SIZE = 50;

const isImage = (asset: TimelineAsset) => asset.type === 'IMAGE';

/** Endless image sequence with a bounded back-history, fed batch by batch from a source. */
export class SlideshowPlaylist {
	private history: TimelineAsset[] = [];
	private cursor = -1;
	private queue: TimelineAsset[] = [];
	private filling: Promise<TimelineAsset | null> | null = null;

	constructor(private readonly pull: BatchSource) {}

	current(): TimelineAsset | null {
		return this.history[this.cursor] ?? null;
	}

	// Resolves the upcoming asset without moving the cursor, so it can be preloaded during the dwell.
	peek(): Promise<TimelineAsset | null> {
		const known = this.history[this.cursor + 1];
		if (known) return Promise.resolve(known);
		if (!this.filling) {
			this.filling = this.take()
				.then((asset) => {
					if (asset) this.history.push(asset);
					return asset;
				})
				.finally(() => {
					this.filling = null;
				});
		}
		return this.filling;
	}

	async next(): Promise<TimelineAsset | null> {
		const asset = await this.peek();
		if (!asset) return null;
		this.cursor++;
		const overflow = Math.min(this.history.length - HISTORY_LIMIT, this.cursor);
		if (overflow > 0) {
			this.history.splice(0, overflow);
			this.cursor -= overflow;
		}
		return asset;
	}

	previous(): TimelineAsset | null {
		if (this.cursor <= 0) return null;
		this.cursor--;
		return this.history[this.cursor] ?? null;
	}

	private async take(): Promise<TimelineAsset | null> {
		while (this.queue.length === 0) {
			const batch = await this.pull();
			if (!batch) return null;
			this.queue = batch.filter(isImage);
		}
		return this.queue.shift() ?? null;
	}
}

function shuffled<T>(items: T[]): T[] {
	const copy = items.slice();
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
}

function listSource(assets: TimelineAsset[], startIndex: number, order: SlideshowOrder): BatchSource {
	if (!assets.some(isImage)) return () => Promise.resolve(null);
	if (order === 'shuffle') return () => Promise.resolve(shuffled(assets));
	let first = true;
	return () => {
		const batch = first ? assets.slice(startIndex + 1) : assets;
		first = false;
		return Promise.resolve(batch);
	};
}

function timelineSource(buckets: TimelineBucket[], fetchMonth: (timeBucket: string) => Promise<DayGroup[]>, start: TimelineAsset | null): BatchSource {
	let index = start ? Math.max(0, buckets.findIndex((b) => monthKey(b.timeBucket) === monthKey(start.localDateTime))) : 0;
	let skipThrough = start?.id;
	let monthsWithoutImages = 0;
	return async () => {
		// A full lap without a single image: the scope only holds videos.
		if (!buckets.length || monthsWithoutImages > buckets.length) return null;
		const bucket = buckets[index % buckets.length]!;
		index++;
		let assets = (await fetchMonth(bucket.timeBucket)).flatMap((group) => group.assets);
		if (skipThrough) {
			const at = assets.findIndex((asset) => asset.id === skipThrough);
			if (at >= 0) assets = assets.slice(at + 1);
			skipThrough = undefined;
		}
		monthsWithoutImages = assets.some(isImage) ? 0 : monthsWithoutImages + 1;
		return assets;
	};
}

function randomSource(repository: PhotoRepository, scope: TimelineScope): BatchSource {
	return async () => {
		const batch = await repository.searchRandomImages(scope, RANDOM_BATCH_SIZE);
		return batch.length ? batch : null;
	};
}

// The start asset leads so a slideshow launched from the viewer opens on the photo being viewed.
function withLead(start: TimelineAsset | null, source: BatchSource): BatchSource {
	let lead = start && isImage(start) ? [start] : null;
	return () => {
		if (!lead) return source();
		const batch = lead;
		lead = null;
		return Promise.resolve(batch);
	};
}

export interface SlideshowTimelineSource {
	scope: TimelineScope;
	allBuckets: TimelineBucket[];
	fetchMonth: (timeBucket: string) => Promise<DayGroup[]>;
}

// Month-bucket timelines walk months in order or shuffle server-side; in-memory lists
// (search results, places) are walked or shuffled locally.
export interface SlideshowSource {
	timeline?: SlideshowTimelineSource;
	assets: TimelineAsset[];
}

interface PlaylistOptions extends SlideshowSource {
	order: SlideshowOrder;
	start: TimelineAsset | null;
	repository: PhotoRepository;
}

export function createSlideshowPlaylist({order, start, repository, timeline, assets}: PlaylistOptions): SlideshowPlaylist {
	let source: BatchSource;
	if (timeline) {
		source = order === 'shuffle' ? randomSource(repository, timeline.scope) : timelineSource(timeline.allBuckets, timeline.fetchMonth, start);
	} else {
		source = listSource(assets, start ? assets.findIndex((asset) => asset.id === start.id) : -1, order);
	}
	return new SlideshowPlaylist(withLead(start, source));
}
