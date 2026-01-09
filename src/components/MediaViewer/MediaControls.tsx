import React from 'react';
import Button from '@enact/sandstone/Button';
import css from './MediaViewer.module.less';

interface MediaControlsProps {
	currentIndex: number;
	totalCount: number;
	onPrev: () => void;
	onNext: () => void;
	onClose: () => void;
	canGoPrev: boolean;
	canGoNext: boolean;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
	currentIndex,
	totalCount,
	onPrev,
	onNext,
	onClose,
	canGoPrev,
	canGoNext,
}) => {
	return (
		<>
			{/* Top bar with close button and counter */}
			<div className={css.topBar}>
				<Button icon="closex" onClick={onClose} className={css.closeButton} />
				<span className={css.counter}>
					{currentIndex + 1} / {totalCount}
				</span>
			</div>

			{/* Navigation arrows */}
			{canGoPrev && (
				<Button
					icon="arrowlargeleft"
					onClick={onPrev}
					className={`${css.navButton} ${css.navButtonLeft}`}
				/>
			)}

			{canGoNext && (
				<Button
					icon="arrowlargeright"
					onClick={onNext}
					className={`${css.navButton} ${css.navButtonRight}`}
				/>
			)}
		</>
	);
};
