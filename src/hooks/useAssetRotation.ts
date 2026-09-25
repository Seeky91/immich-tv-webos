import {useCallback, useReducer} from 'react';
import {getRotation, rotateClockwise, type Rotation} from '../utils/rotationStore';

export const useAssetRotation = (assetId: string | undefined): [Rotation, () => void] => {
	const [, rerender] = useReducer((n: number) => n + 1, 0);
	const rotate = useCallback(() => {
		if (!assetId) return;
		rotateClockwise(assetId);
		rerender();
	}, [assetId]);
	return [assetId ? getRotation(assetId) : 0, rotate];
};
