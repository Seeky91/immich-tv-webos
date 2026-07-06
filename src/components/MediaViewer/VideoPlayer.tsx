import React from 'react';
import {VideoPlayer as SandstoneVideoPlayer} from '@enact/sandstone/VideoPlayer';
import css from './MediaViewer.module.less';

// Subset of the imperative API exposed by Sandstone's ApiDecorator (available on a ref
// to the decorated component).
export interface VideoPlayerApi {
	areControlsVisible: () => boolean;
	showControls: () => void;
	hideControls: () => void;
}

interface VideoPlayerProps {
	src: string;
	// Fired by Sandstone when its media controls show/hide. Documented as ({available}),
	// but forwardCustom drops the payload — read `areControlsVisible()` instead.
	onControlsAvailable?: (ev: {available?: boolean}) => void;
	// Not Sandstone's `playerRef` prop (that one exposes the DOM node, not the API).
	apiRef?: React.Ref<VideoPlayerApi>;
}

// Sandstone exposes VideoPlayer with a Slottable-only typing — `autoCloseTimeout`,
// `jumpBy`, `noAutoPlay`, `spotlightDisabled` and friends live on VideoPlayerBaseProps
// and are forwarded at runtime through Sandstone's HOC chain. Spread with an `as any`
// cast is the established pattern in this project (see SearchPanel onComplete).
//
// HIDDEN_BACK_LABEL acts as a stable CSS hook: Sandstone renders its own back button
// at top-left when controls are visible (duplicate of our MediaControls close X).
// We set a sentinel aria-label and hide via [aria-label="..."] in the LESS module —
// targeting the CSS-Modules hash directly would break on every Sandstone rebuild.
const HIDDEN_BACK_LABEL = 'immich-tv-internal-back-hidden';

const PLAYER_PROPS = {
	autoCloseTimeout: 5000,
	jumpBy: 10,
	noAutoPlay: false,
	// Keep the transport bar closed on arrival: while hidden, left/right page between media
	// (intercepted by MediaViewer); OK/down opens it and left/right become seek again.
	noAutoShowMediaControls: true,
	spotlightDisabled: false,
	backButtonAriaLabel: HIDDEN_BACK_LABEL,
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({src, onControlsAvailable, apiRef}) => {
	const playerProps = {...PLAYER_PROPS, onControlsAvailable, ref: apiRef};
	return (
		<SandstoneVideoPlayer {...(playerProps as any)} className={css.viewerMedia}>
			<source src={src} type="video/mp4" />
		</SandstoneVideoPlayer>
	);
};

VideoPlayer.displayName = 'VideoPlayer';
