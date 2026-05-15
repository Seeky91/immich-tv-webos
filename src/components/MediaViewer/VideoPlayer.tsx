import React, {useRef, useEffect} from 'react';
import css from './MediaViewer.module.less';

interface VideoPlayerProps {
	src: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({src}) => {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleError = () => {
			console.error('Video playback error:', video.error);
		};

		const handleLoadedData = () => {
			video.play().catch((err) => {
				console.warn('Video autoplay failed:', err);
			});
		};

		video.addEventListener('error', handleError);
		video.addEventListener('loadeddata', handleLoadedData);

		return () => {
			video.removeEventListener('error', handleError);
			video.removeEventListener('loadeddata', handleLoadedData);
		};
	}, [src]);

	useEffect(() => {
		const video = videoRef.current;
		return () => {
			if (video) {
				video.pause();
				video.src = '';
				video.load();
			}
		};
	}, []);

	return <video ref={videoRef} src={src} controls className={css.viewerMedia} />;
};
