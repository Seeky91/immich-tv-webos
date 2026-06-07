import React, {useCallback, useEffect, useRef} from 'react';
import Spotlight from '@enact/spotlight';
import {useWebOSKeys} from '../../hooks/useWebOSKeys';
import {useAutoHideControls} from '../../hooks/useAutoHideControls';
import {useRepository} from '../../domain/RepositoryContext';
import {createSpotlightContainer} from '../../utils/spotlight';
import type {TimelineAsset} from '../../domain/types';
import {MediaControls, CLOSE_BUTTON_SPOTLIGHT_ID} from './MediaControls';
import {VideoPlayer} from './VideoPlayer';
import css from './MediaViewer.module.less';

interface MediaViewerProps {
	getAssetAt: (index: number) => TimelineAsset | null;
	totalCount: number;
	currentIndex: number;
	onClose: () => void;
	onNavigate: (direction: 'prev' | 'next') => void;
}

const VIEWER_SPOTLIGHT_ID = 'media-viewer';
// Trap Spotlight inside the viewer so D-pad can't reach the underlying rail/grid (which would
// trigger NavigationRail's focus-based expand and other surprises).
const ViewerContainer = createSpotlightContainer({enterTo: 'last-focused'});

export const MediaViewer: React.FC<MediaViewerProps> = React.memo(({getAssetAt, totalCount, currentIndex, onClose, onNavigate}) => {
	const repository = useRepository();
	const asset = getAssetAt(currentIndex);

	const handlePrev = useCallback(() => {
		if (currentIndex > 0) onNavigate('prev');
	}, [onNavigate, currentIndex]);

	const handleNext = useCallback(() => {
		if (currentIndex < totalCount - 1) onNavigate('next');
	}, [onNavigate, currentIndex, totalCount]);

	const isVideo = asset?.type === 'VIDEO';

	// Auto-hide is for still images only. Video keeps its always-visible MediaControls and
	// relies on Sandstone VideoPlayer's own auto-hide (OK/Select is play/pause there).
	const {visible: controlsVisible} = useAutoHideControls({enabled: !isVideo});

	useWebOSKeys({
		onBack: onClose,
		onArrowLeft: isVideo ? undefined : handlePrev,
		onArrowRight: isVideo ? undefined : handleNext,
	});

	useEffect(() => {
		Spotlight.focus(VIEWER_SPOTLIGHT_ID);
	}, []);

	// When the controls reappear (after a reveal key), move focus onto the ✕ so they are
	// immediately actionable. Skip the first run: initial focus is handled by the mount
	// effect above. Runs as a passive effect (post-commit), so the button is already
	// visibility:visible and therefore focusable. This also fires when navigating from a
	// video to an image (isVideo true→false) — focusing ✕ then is intentional and benign.
	const didFocusOnceRef = useRef(false);
	useEffect(() => {
		if (!didFocusOnceRef.current) {
			didFocusOnceRef.current = true;
			return;
		}
		if (controlsVisible && !isVideo) {
			Spotlight.focus(CLOSE_BUTTON_SPOTLIGHT_ID);
		}
	}, [controlsVisible, isVideo]);

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

	const mediaUrl = isVideo ? repository.videoPlaybackUrl(asset.id) : repository.previewUrl(asset.id);

	return (
		<ViewerContainer spotlightId={VIEWER_SPOTLIGHT_ID} spotlightRestrict="self-only" className={css.viewerOverlay}>
			<div className={css.viewerContent}>{isVideo ? <VideoPlayer src={mediaUrl} /> : <img src={mediaUrl} alt="" className={css.viewerMedia} />}</div>
			<MediaControls
				currentIndex={currentIndex}
				totalCount={totalCount}
				onPrev={handlePrev}
				onNext={handleNext}
				onClose={onClose}
				canGoPrev={currentIndex > 0}
				canGoNext={currentIndex < totalCount - 1}
				controlsVisible={controlsVisible}
			/>
		</ViewerContainer>
	);
});

MediaViewer.displayName = 'MediaViewer';
