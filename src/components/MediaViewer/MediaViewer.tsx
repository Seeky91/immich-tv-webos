import React, {useCallback} from 'react';
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
	const handlePrev = useCallback(() => {
		if (currentIndex > 0) onNavigate('prev');
	}, [onNavigate, currentIndex]);

	const handleNext = useCallback(() => {
		if (currentIndex < allAssets.length - 1) onNavigate('next');
	}, [onNavigate, currentIndex, allAssets.length]);

	useWebOSKeys({onBack: onClose, onArrowLeft: handlePrev, onArrowRight: handleNext});

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
