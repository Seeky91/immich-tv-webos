import React from 'react';
import Button from '@enact/sandstone/Button';
import css from './MediaViewer.module.less';

// Stable Spotlight ids so MediaViewer can re-focus the close button when controls reappear.
export const CLOSE_BUTTON_SPOTLIGHT_ID = 'media-viewer-close';
export const SLIDESHOW_BUTTON_SPOTLIGHT_ID = 'media-viewer-slideshow';

interface MediaControlsProps {
	currentIndex: number;
	totalCount: number;
	onPrev: () => void;
	onNext: () => void;
	onClose: () => void;
	onStartSlideshow?: () => void;
	canGoPrev: boolean;
	canGoNext: boolean;
	controlsVisible: boolean;
}

export const MediaControls: React.FC<MediaControlsProps> = React.memo(({currentIndex, totalCount, onPrev, onNext, onClose, onStartSlideshow, canGoPrev, canGoNext, controlsVisible}) => {
	const wrapperClass = controlsVisible ? css.controls : `${css.controls} ${css.controlsHidden}`;

	return (
		<div className={wrapperClass}>
			<div className={css.topBar}>
				<Button icon="closex" onClick={onClose} spotlightId={CLOSE_BUTTON_SPOTLIGHT_ID} className={css.closeButton} />
				<span className={css.counter}>
					{currentIndex + 1} / {totalCount}
				</span>
			</div>

			{canGoPrev && <Button icon="arrowlargeleft" size="large" onClick={onPrev} className={`${css.navButton} ${css.navButtonLeft}`} />}
			{canGoNext && <Button icon="arrowlargeright" size="large" onClick={onNext} className={`${css.navButton} ${css.navButtonRight}`} />}

			{onStartSlideshow && (
				<div className={css.bottomBar}>
					<Button icon="play" size="small" onClick={onStartSlideshow} spotlightId={SLIDESHOW_BUTTON_SPOTLIGHT_ID}>
						Slideshow
					</Button>
				</div>
			)}
		</div>
	);
});

MediaControls.displayName = 'MediaControls';
