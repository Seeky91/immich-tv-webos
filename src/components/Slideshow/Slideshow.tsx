import React, {useCallback, useEffect, useRef, useState} from 'react';
import Button from '@enact/sandstone/Button';
import Spotlight from '@enact/spotlight';
import {useRepository} from '../../domain/RepositoryContext';
import {useAutoHideControls} from '../../hooks/useAutoHideControls';
import {SLIDESHOW_INTERVALS_S, useSlideshowSettings} from '../../hooks/useSlideshowSettings';
import {useWebOSKeys} from '../../hooks/useWebOSKeys';
import {getRotation} from '../../utils/rotationStore';
import {holdScreenSaver} from '../../utils/screenSaver';
import {MediaInfo} from '../MediaInfo/MediaInfo';
import {RoundButton} from '../RoundButton';
import {createSpotlightContainer, forceFocus} from '../../utils/spotlight';
import {createSlideshowPlaylist, type SlideshowOrder, type SlideshowSource} from '../../domain/slideshow';
import type {TimelineAsset} from '../../domain/types';
import css from './Slideshow.module.less';

interface SlideshowProps {
	start: TimelineAsset | null;
	source: SlideshowSource;
	onExit: (last: TimelineAsset | null) => void;
}

// Two stacked layers crossfade on opacity only (compositor work, cheap on TV GPUs).
interface Stage {
	slots: [TimelineAsset | null, TimelineAsset | null];
	front: 0 | 1;
	// Slot whose image is loading and becomes front once loaded.
	incoming: 0 | 1 | null;
}

const SLIDESHOW_SPOTLIGHT_ID = 'slideshow';
const PLAY_BUTTON_SPOTLIGHT_ID = 'slideshow-play';
const MAX_BROKEN_SKIPS = 5;
const PLAY_PAUSE_KEYCODES = new Set([415, 19, 179]);

const Container = createSpotlightContainer({enterTo: 'default-element'});
const swallowKey = () => {};

// Decoding ahead of the swap keeps the crossfade from stuttering on the first frame.
function preload(url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => (img.decode ? img.decode().then(resolve, resolve) : resolve());
		img.onerror = reject;
		img.src = url;
	});
}

interface SlideLayerProps {
	asset: TimelineAsset;
	slot: 0 | 1;
	isFront: boolean;
	onLoad: (slot: 0 | 1) => void;
}

const SlideLayer: React.FC<SlideLayerProps> = ({asset, slot, isFront, onLoad}) => {
	const repository = useRepository();
	const handleLoad = useCallback(() => onLoad(slot), [onLoad, slot]);
	const rotation = getRotation(asset.id);
	const className = [css.layer, isFront && css.front, rotation % 180 && css.quarterTurn].filter(Boolean).join(' ');
	return (
		<img
			src={repository.previewUrl(asset.id)}
			alt=""
			className={className}
			style={rotation ? {transform: `rotate(${rotation}deg)`} : undefined}
			onLoad={handleLoad}
		/>
	);
};

const formatInterval = (seconds: number) => (seconds < 60 ? `${seconds} s` : `${seconds / 60} min`);

export const Slideshow: React.FC<SlideshowProps> = ({start, source, onExit}) => {
	const repository = useRepository();
	const [settings, updateSettings] = useSlideshowSettings();
	const createPlaylist = useCallback(
		(order: SlideshowOrder, from: TimelineAsset | null) => createSlideshowPlaylist({order, start: from, repository, ...source}),
		[repository, source]
	);
	const [playlist, setPlaylist] = useState(() => createPlaylist(settings.order, start));
	const [stage, setStage] = useState<Stage>({slots: [null, null], front: 0, incoming: null});
	const [paused, setPaused] = useState(false);
	const [isEmpty, setIsEmpty] = useState(false);
	// Bumped after a failed advance so the dwell timer re-arms and retries.
	const [retryTick, setRetryTick] = useState(0);
	const generationRef = useRef(0);
	const hasShownRef = useRef(false);
	const current = stage.slots[stage.front];

	const {visible: osdVisible} = useAutoHideControls({enabled: true});

	// Latest request wins: a slow load can't overwrite a newer one (e.g. rapid Right presses).
	const advance = useCallback(
		async (pick: () => Promise<TimelineAsset | null> | TimelineAsset | null) => {
			const generation = ++generationRef.current;
			try {
				for (let skips = 0; skips <= MAX_BROKEN_SKIPS; skips++) {
					const asset = await (skips === 0 ? pick() : playlist.next());
					if (generation !== generationRef.current) return;
					if (!asset) {
						if (!hasShownRef.current) setIsEmpty(true);
						return;
					}
					try {
						await preload(repository.previewUrl(asset.id));
					} catch {
						continue;
					}
					if (generation !== generationRef.current) return;
					hasShownRef.current = true;
					setStage((prev) => {
						if (prev.slots[prev.front]?.id === asset.id) return prev;
						const back = prev.front === 0 ? 1 : 0;
						// Same image already in the back slot: no load event will fire, flip now.
						if (prev.slots[back]?.id === asset.id) return {...prev, front: back, incoming: null};
						const slots: Stage['slots'] = [...prev.slots];
						slots[back] = asset;
						return {slots, front: prev.front, incoming: back};
					});
					return;
				}
			} catch {
				if (generation === generationRef.current) setRetryTick((tick) => tick + 1);
			}
		},
		[playlist, repository]
	);

	const handleLayerLoad = useCallback((slot: 0 | 1) => {
		setStage((prev) => (prev.incoming === slot ? {...prev, front: slot, incoming: null} : prev));
	}, []);

	useEffect(() => {
		void advance(() => playlist.next());
	}, [playlist, advance]);

	useEffect(() => {
		if (paused || stage.incoming !== null || (!current && !retryTick)) return undefined;
		playlist
			.peek()
			.then((next) => next && preload(repository.previewUrl(next.id)))
			.catch(() => {});
		const timer = window.setTimeout(() => void advance(() => playlist.next()), settings.intervalSeconds * 1000);
		return () => window.clearTimeout(timer);
	}, [current, paused, stage.incoming, settings.intervalSeconds, playlist, repository, advance, retryTick]);

	useEffect(() => holdScreenSaver(), []);

	const handleExit = useCallback(() => onExit(current), [onExit, current]);
	const handleNext = useCallback(() => void advance(() => playlist.next()), [advance, playlist]);
	const handlePrevious = useCallback(() => void advance(() => playlist.previous()), [advance, playlist]);
	const togglePaused = useCallback(() => setPaused((value) => !value), []);

	const toggleOrder = useCallback(() => {
		const order = settings.order === 'shuffle' ? 'sequential' : 'shuffle';
		updateSettings({order});
		setPlaylist(createPlaylist(order, current));
	}, [settings.order, updateSettings, createPlaylist, current]);

	const cycleInterval = useCallback(() => {
		const index = SLIDESHOW_INTERVALS_S.indexOf(settings.intervalSeconds);
		updateSettings({intervalSeconds: SLIDESHOW_INTERVALS_S[(index + 1) % SLIDESHOW_INTERVALS_S.length]});
	}, [settings.intervalSeconds, updateSettings]);

	useWebOSKeys({
		onBack: handleExit,
		// Hidden OSD: left/right page photos. Visible: Spotlight moves between the OSD buttons.
		onArrowLeft: osdVisible ? undefined : handlePrevious,
		onArrowRight: osdVisible ? undefined : handleNext,
		onArrowUp: osdVisible ? swallowKey : undefined,
		onArrowDown: osdVisible ? swallowKey : undefined,
	});

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!PLAY_PAUSE_KEYCODES.has(event.keyCode)) return;
			event.preventDefault();
			togglePaused();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [togglePaused]);

	useEffect(() => {
		if (osdVisible) forceFocus(PLAY_BUTTON_SPOTLIGHT_ID);
	}, [osdVisible]);

	useEffect(() => {
		Spotlight.focus(SLIDESHOW_SPOTLIGHT_ID);
	}, []);

	return (
		<Container spotlightId={SLIDESHOW_SPOTLIGHT_ID} spotlightRestrict="self-only" className={css.slideshow}>
			{stage.slots.map((asset, slot) =>
				asset ? <SlideLayer key={slot} asset={asset} slot={slot as 0 | 1} isFront={slot === stage.front} onLoad={handleLayerLoad} /> : null
			)}
			{isEmpty && <div className={css.message}>No photos to show.</div>}
			<div className={osdVisible ? css.osd : `${css.osd} ${css.osdHidden}`}>
				<div className={css.info}>{current && <MediaInfo asset={current} />}</div>
				<div className={css.actionBar}>
					<RoundButton
						icon={paused ? 'play' : 'pause'}
						tooltipText={paused ? 'Play' : 'Pause'}
						spotlightId={PLAY_BUTTON_SPOTLIGHT_ID}
						data-spotlight-default-element
						onClick={togglePaused}
					/>
					<RoundButton
						icon={settings.order === 'shuffle' ? 'shuffleon' : 'shuffle'}
						tooltipText={settings.order === 'shuffle' ? 'Shuffle on' : 'Shuffle off'}
						onClick={toggleOrder}
					/>
					<Button size="small" backgroundOpacity="transparent" tooltipText="Interval" onClick={cycleInterval}>
						{formatInterval(settings.intervalSeconds)}
					</Button>
					<RoundButton icon="closex" tooltipText="Exit" onClick={handleExit} />
				</div>
			</div>
		</Container>
	);
};

Slideshow.displayName = 'Slideshow';
