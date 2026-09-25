import React, {useCallback} from 'react';
import Button from '@enact/sandstone/Button';
import {MediaInfo} from '../MediaInfo/MediaInfo';
import {RoundButton} from '../RoundButton';
import {createSpotlightContainer} from '../../utils/spotlight';
import type {TimelineAsset} from '../../domain/types';
import css from './MediaViewer.module.less';

export const CLOSE_BUTTON_SPOTLIGHT_ID = 'media-viewer-close';
export const ACTION_BAR_SPOTLIGHT_ID = 'media-viewer-actions';

const ActionBar = createSpotlightContainer({enterTo: 'last-focused'});

interface MediaControlsProps {
	asset: TimelineAsset;
	position: string;
	isVideo: boolean;
	controlsVisible: boolean;
	canGoPrev: boolean;
	canGoNext: boolean;
	onPrev: () => void;
	onNext: () => void;
	onClose: () => void;
	onRotate: () => void;
	onStartSlideshow: () => void;
	onActionBarFocusChange: (focused: boolean) => void;
}

export const MediaControls: React.FC<MediaControlsProps> = React.memo(
	({asset, position, isVideo, controlsVisible, canGoPrev, canGoNext, onPrev, onNext, onClose, onRotate, onStartSlideshow, onActionBarFocusChange}) => {
		const handleBarFocus = useCallback(() => onActionBarFocusChange(true), [onActionBarFocusChange]);
		const handleBarBlur = useCallback(
			(event: React.FocusEvent<HTMLDivElement>) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onActionBarFocusChange(false);
			},
			[onActionBarFocusChange]
		);

		return (
			<div className={controlsVisible ? css.controls : `${css.controls} ${css.controlsHidden}`}>
				<div className={css.topBar}>
					{/* Video has no action bar (Down opens the transport bar), so it keeps a close button here. */}
					{isVideo && (
						<Button icon="closex" size="small" backgroundOpacity="transparent" onClick={onClose} spotlightId={CLOSE_BUTTON_SPOTLIGHT_ID} />
					)}
					<MediaInfo asset={asset} />
					<span className={css.position}>{position}</span>
				</div>

				{/* Pointer-only: the D-pad pages with left/right directly. */}
				{canGoPrev && (
					<Button icon="arrowlargeleft" backgroundOpacity="transparent" spotlightDisabled onClick={onPrev} className={`${css.navButton} ${css.navButtonLeft}`} />
				)}
				{canGoNext && (
					<Button icon="arrowlargeright" backgroundOpacity="transparent" spotlightDisabled onClick={onNext} className={`${css.navButton} ${css.navButtonRight}`} />
				)}

				{!isVideo && (
					<div className={css.bottomBar}>
						<ActionBar spotlightId={ACTION_BAR_SPOTLIGHT_ID} className={css.actionBar} onFocus={handleBarFocus} onBlur={handleBarBlur}>
							<RoundButton icon="rotate" tooltipText="Rotate" onClick={onRotate} />
							<RoundButton icon="play" tooltipText="Slideshow" onClick={onStartSlideshow} />
							<RoundButton icon="closex" tooltipText="Close" onClick={onClose} />
						</ActionBar>
					</div>
				)}
			</div>
		);
	}
);

MediaControls.displayName = 'MediaControls';
