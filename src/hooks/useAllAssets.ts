import {useMemo} from 'react';
import type {InfiniteData} from '@tanstack/react-query';
import type {ImmichAsset, GroupedAssetsPage, GroupedAsset} from '../api/types';

export const useAllAssets = (data: InfiniteData<GroupedAssetsPage> | undefined): ImmichAsset[] => {
	return useMemo<ImmichAsset[]>(() => {
		if (!data?.pages) return [];
		return data.pages.flatMap((page) => page.groups.flatMap((group: GroupedAsset) => group.assets));
	}, [data]);
};
