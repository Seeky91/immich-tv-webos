import React, {useCallback, useEffect} from 'react';
import {useWebOSKeys} from '../../hooks/useWebOSKeys';
import type {ImmichAsset} from '../../api/types';
import type {ImmichAPI} from '../../api/immich';
import {MediaControls} from './MediaControls';
import {VideoPlayer} from './VideoPlayer';
import css from './MediaViewer.module.less';

interface MediaViewerProps {
	asset: ImmichAsset | null;
	allAssets: ImmichAsset[];
	currentIndex: number;
	onClose: () => void;
	onNavigate: (direction: 'prev' | 'next') => void;
	api: ImmichAPI;
}

export const MediaViewer: React.FC<MediaViewerProps> = React.memo(({asset, allAssets, currentIndex, onClose, onNavigate, api}) => {
	useWebOSKeys({onBack: onClose});

	const handlePrev = useCallback(() => onNavigate('prev'), [onNavigate]);
	const handleNext = useCallback(() => onNavigate('next'), [onNavigate]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowLeft':
					e.preventDefault();
					if (currentIndex > 0) onNavigate('prev');
					break;
				case 'ArrowRight':
					e.preventDefault();
					if (currentIndex < allAssets.length - 1) onNavigate('next');
					break;
				case 'Escape':
					e.preventDefault();
					onClose();
					break;
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onNavigate, onClose, currentIndex, allAssets.length]);

	if (!asset) return null;

	const isVideo = asset.type === 'VIDEO';
	const mediaUrl = isVideo ? api.getOriginalUrl(asset.id) : api.getPreviewUrl(asset.id);

	return (
		<div className={css.viewerOverlay}>
			<div className={css.viewerContent}>{isVideo ? <VideoPlayer src={mediaUrl} /> : <img src={mediaUrl} alt="" className={css.viewerImage} />}</div>
			<MediaControls
				currentIndex={currentIndex}
				totalCount={allAssets.length}
				onPrev={handlePrev}
				onNext={handleNext}
				onClose={onClose}
				canGoPrev={currentIndex > 0}
				canGoNext={currentIndex < allAssets.length - 1}
			/>
		</div>
	);
});

MediaViewer.displayName = 'MediaViewer';
