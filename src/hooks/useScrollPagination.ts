import {useCallback} from 'react';
import {SCROLL_THRESHOLD_ITEMS} from '../utils/constants';

interface ScrollEvent {
	moreInfo?: {firstVisibleIndex: number; lastVisibleIndex: number};
}

interface UseScrollPaginationOptions {
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	fetchNextPage: () => void;
	loadedGroupCount: number;
}

export const useScrollPagination = ({hasNextPage, isFetchingNextPage, fetchNextPage, loadedGroupCount}: UseScrollPaginationOptions) => {
	const handleScroll = useCallback(
		({moreInfo}: ScrollEvent) => {
			if (!hasNextPage || isFetchingNextPage) return;
			const lastVisible = moreInfo?.lastVisibleIndex ?? 0;
			if (lastVisible >= loadedGroupCount - SCROLL_THRESHOLD_ITEMS) {
				fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage, loadedGroupCount]
	);

	return {handleScroll};
};
