import {useCallback, useState} from 'react';
import type {TimelineAsset} from '../domain/types';

interface ViewerState {
	assetId: string;
	assetIndex: number;
}

interface MediaViewerControls {
	state: ViewerState | null;
	open: (index: number) => void;
	close: () => void;
	navigate: (direction: 'prev' | 'next') => void;
}

export const useMediaViewer = (assets: TimelineAsset[]): MediaViewerControls => {
	const [assetId, setAssetId] = useState<string | null>(null);
	const assetIndex = assetId ? assets.findIndex((asset) => asset.id === assetId) : -1;
	const state = assetId && assetIndex >= 0 ? {assetId, assetIndex} : null;

	const open = useCallback(
		(index: number) => {
			const asset = assets[index];
			if (asset) setAssetId(asset.id);
		},
		[assets]
	);

	const close = useCallback(() => setAssetId(null), []);

	const navigate = useCallback(
		(direction: 'prev' | 'next') => {
			setAssetId((currentAssetId) => {
				if (!currentAssetId) return null;
				const currentIndex = assets.findIndex((asset) => asset.id === currentAssetId);
				if (currentIndex < 0) return currentAssetId;
				const newIndex = direction === 'prev' ? Math.max(0, currentIndex - 1) : Math.min(assets.length - 1, currentIndex + 1);
				return assets[newIndex]?.id ?? currentAssetId;
			});
		},
		[assets]
	);

	return {state, open, close, navigate};
};
