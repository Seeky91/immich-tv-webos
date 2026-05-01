import {useCallback} from 'react';
import {SCROLL_THRESHOLD_ITEMS} from '../utils/constants';

interface ScrollEvent {
	scrollTop: number;
	scrollLeft: number;
	moreInfo?: {firstVisibleIndex: number; lastVisibleIndex: number};
}

interface UseScrollPaginationOptions {
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
	loadedGroupCount: number;
	threshold?: number;
}

export const useScrollPagination = ({hasNextPage, isFetchingNextPage, fetchNextPage, loadedGroupCount, threshold = SCROLL_THRESHOLD_ITEMS}: UseScrollPaginationOptions) => {
	const handleScroll = useCallback(
		({moreInfo}: ScrollEvent) => {
			if (!hasNextPage || isFetchingNextPage) return;
			const lastVisible = moreInfo?.lastVisibleIndex ?? 0;
			if (lastVisible >= loadedGroupCount - threshold) {
				fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage, loadedGroupCount, threshold]
	);

	return {handleScroll};
};
