import {useCallback, useState} from 'react';

export interface ViewerState {
	isOpen: boolean;
	assetIndex: number;
}

export interface MediaViewerControls {
	state: ViewerState | null;
	isOpen: boolean;
	open: (index: number) => void;
	close: () => void;
	navigate: (direction: 'prev' | 'next') => void;
}

export const useMediaViewer = (totalAssets: number): MediaViewerControls => {
	const [state, setState] = useState<ViewerState | null>(null);

	const open = useCallback((index: number) => {
		setState({isOpen: true, assetIndex: index});
	}, []);

	const close = useCallback(() => setState(null), []);

	const navigate = useCallback(
		(direction: 'prev' | 'next') => {
			setState((prev) => {
				if (!prev) return null;
				const newIndex =
					direction === 'prev'
						? Math.max(0, prev.assetIndex - 1)
						: Math.min(totalAssets - 1, prev.assetIndex + 1);
				return {...prev, assetIndex: newIndex};
			});
		},
		[totalAssets]
	);

	return {state, isOpen: !!state?.isOpen, open, close, navigate};
};
