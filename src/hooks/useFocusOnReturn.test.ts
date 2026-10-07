import {renderHook} from '@testing-library/react';
import {useFocusOnReturn} from './useFocusOnReturn';
import {forceFocus} from '../utils/spotlight';

jest.mock('../utils/spotlight', () => ({forceFocus: jest.fn()}));

const idFor = (key: string) => `card-${key}`;

describe('useFocusOnReturn', () => {
	beforeEach(() => (forceFocus as jest.Mock).mockClear());

	test('focuses the card that opened the detail view once it closes', () => {
		const {rerender} = renderHook(({opened}) => useFocusOnReturn(opened, idFor), {initialProps: {opened: null as string | null}});
		expect(forceFocus).not.toHaveBeenCalled();

		rerender({opened: 'paris'});
		expect(forceFocus).not.toHaveBeenCalled();

		rerender({opened: null});
		expect(forceFocus).toHaveBeenCalledWith('card-paris');
	});

	test('focuses only once per return, even if the effect re-runs', () => {
		const {rerender} = renderHook(({opened, toId}) => useFocusOnReturn(opened, toId), {
			initialProps: {opened: 'paris' as string | null, toId: idFor},
		});
		rerender({opened: null, toId: idFor});
		rerender({opened: null, toId: (key: string) => `other-${key}`});
		expect(forceFocus).toHaveBeenCalledTimes(1);
	});
});
