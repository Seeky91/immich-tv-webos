import React, {useCallback, useEffect} from 'react';
import {useWebOSKeys} from '../../hooks/useWebOSKeys';
import {useRepository} from '../../domain/RepositoryContext';
import type {TimelineAsset} from '../../domain/types';
import {MediaControls} from './MediaControls';
import {VideoPlayer} from './VideoPlayer';
import css from './MediaViewer.module.less';

interface MediaViewerProps {
	getAssetAt: (index: number) => TimelineAsset | null;
	totalCount: number;
	currentIndex: number;
	onClose: () => void;
	onNavigate: (direction: 'prev' | 'next') => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = React.memo(({getAssetAt, totalCount, currentIndex, onClose, onNavigate}) => {
	const repository = useRepository();
	const asset = getAssetAt(currentIndex);

	const handlePrev = useCallback(() => {
		if (currentIndex > 0) onNavigate('prev');
	}, [onNavigate, currentIndex]);

	const handleNext = useCallback(() => {
		if (currentIndex < totalCount - 1) onNavigate('next');
	}, [onNavigate, currentIndex, totalCount]);

	useWebOSKeys({onBack: onClose, onArrowLeft: handlePrev, onArrowRight: handleNext});

	useEffect(() => {
		const prefetch = (index: number) => {
			const neighbor = getAssetAt(index);
			if (!neighbor || neighbor.type === 'VIDEO') return;
			const img = new Image();
			img.src = repository.previewUrl(neighbor.id);
		};
		prefetch(currentIndex - 1);
		prefetch(currentIndex + 1);
	}, [currentIndex, getAssetAt, repository]);

	if (!asset) return null;

	const isVideo = asset.type === 'VIDEO';
	const mediaUrl = isVideo ? repository.originalUrl(asset.id) : repository.previewUrl(asset.id);

	return (
		<div className={css.viewerOverlay}>
			<div className={css.viewerContent}>{isVideo ? <VideoPlayer src={mediaUrl} /> : <img src={mediaUrl} alt="" className={css.viewerImage} />}</div>
			<MediaControls
				currentIndex={currentIndex}
				totalCount={totalCount}
				onPrev={handlePrev}
				onNext={handleNext}
				onClose={onClose}
				canGoPrev={currentIndex > 0}
				canGoNext={currentIndex < totalCount - 1}
			/>
		</div>
	);
});

MediaViewer.displayName = 'MediaViewer';
