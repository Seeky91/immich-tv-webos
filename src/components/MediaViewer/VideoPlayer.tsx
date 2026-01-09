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

		// Log video details for debugging
		console.log('Loading video from URL:', src);

		const handleLoadedMetadata = () => {
			console.log('Video metadata loaded:', {
				duration: video.duration,
				videoWidth: video.videoWidth,
				videoHeight: video.videoHeight,
			});
		};

		const handleError = (e: Event) => {
			console.error('Video error:', video.error);
			console.error('Video error code:', video.error?.code);
			console.error('Video error message:', video.error?.message);
			console.log(e);
		};

		const handleLoadedData = () => {
			console.log('Video data loaded, attempting to play...');
			video.play().catch((err) => {
				console.warn('Video autoplay failed:', err);
			});
		};

		video.addEventListener('loadedmetadata', handleLoadedMetadata);
		video.addEventListener('error', handleError);
		video.addEventListener('loadeddata', handleLoadedData);

		return () => {
			video.removeEventListener('loadedmetadata', handleLoadedMetadata);
			video.removeEventListener('error', handleError);
			video.removeEventListener('loadeddata', handleLoadedData);
		};
	}, [src]);

	useEffect(() => {
		// Cleanup on unmount
		const video = videoRef.current;
		return () => {
			if (video) {
				video.pause();
				video.src = '';
				video.load();
			}
		};
	}, []);

	return (
		<video
			ref={videoRef}
			src={src}
			controls
			className={css.videoPlayer}
			disableRemotePlayback={false}
		/>
	);
};
