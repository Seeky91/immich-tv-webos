import React from 'react';
import {VideoPlayer as SandstoneVideoPlayer} from '@enact/sandstone/VideoPlayer';
import css from './MediaViewer.module.less';

interface VideoPlayerProps {
	src: string;
}

// Sandstone exposes VideoPlayer with a Slottable-only typing — `autoCloseTimeout`,
// `jumpBy`, `noAutoPlay`, `spotlightDisabled` and friends live on VideoPlayerBaseProps
// and are forwarded at runtime through Sandstone's HOC chain. Spread with an `as any`
// cast is the established pattern in this project (see SearchPanel onComplete).
const PLAYER_PROPS = {
	autoCloseTimeout: 5000,
	jumpBy: 10,
	noAutoPlay: false,
	spotlightDisabled: false,
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({src}) => (
	<SandstoneVideoPlayer {...(PLAYER_PROPS as any)} className={css.viewerMedia}>
		<source src={src} type="video/mp4" />
	</SandstoneVideoPlayer>
);

VideoPlayer.displayName = 'VideoPlayer';
