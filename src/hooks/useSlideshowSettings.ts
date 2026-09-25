import {useCallback, useState} from 'react';
import type {SlideshowOrder} from '../domain/slideshow';

export const SLIDESHOW_INTERVALS_S = [5, 10, 30, 60, 300];

export interface SlideshowSettings {
	intervalSeconds: number;
	order: SlideshowOrder;
}

const STORAGE_KEY = 'immich_slideshow';
const DEFAULTS: SlideshowSettings = {intervalSeconds: 10, order: 'sequential'};

function readSettings(): SlideshowSettings {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SlideshowSettings> | null;
		return {
			intervalSeconds: SLIDESHOW_INTERVALS_S.includes(saved?.intervalSeconds ?? 0) ? saved!.intervalSeconds! : DEFAULTS.intervalSeconds,
			order: saved?.order === 'shuffle' ? 'shuffle' : 'sequential',
		};
	} catch {
		return DEFAULTS;
	}
}

export const useSlideshowSettings = () => {
	const [settings, setSettings] = useState(readSettings);

	const updateSettings = useCallback(
		(patch: Partial<SlideshowSettings>) => {
			const next = {...settings, ...patch};
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch {
				// Storage unavailable: the choice still applies for this session.
			}
			setSettings(next);
		},
		[settings]
	);

	return [settings, updateSettings] as const;
};
