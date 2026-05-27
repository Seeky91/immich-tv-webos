import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Spotlight from '@enact/spotlight';
import {AccountCard} from '../../components/AccountCard/AccountCard';
import {AccountActionBar} from '../../components/AccountActionBar/AccountActionBar';
import {SpottableDiv, createSpotlightContainer} from '../../utils/spotlight';
import type {Account} from '../../utils/accountsStore';
import css from './AccountGrid.module.less';

interface AccountGridProps {
	accounts: Account[];
	activeAccountId: string | null;
	defaultAccountId: string | null;
	onSwitch: (id: string) => void;
	onSetDefault: (id: string | null) => void;
	onRemove: (id: string) => void;
	onAdd: () => void;
}

const GRID_SPOTLIGHT_ID = 'account-grid';
const GridContainer = createSpotlightContainer({enterTo: 'last-focused'});

export const AccountGrid: React.FC<AccountGridProps> = ({
	accounts,
	activeAccountId,
	defaultAccountId,
	onSwitch,
	onSetDefault,
	onRemove,
	onAdd,
}) => {
	const [focusedId, setFocusedId] = useState<string | null>(activeAccountId);

	const sorted = useMemo(
		() => [...accounts].sort((a, b) => b.addedAt - a.addedAt),
		[accounts],
	);

	// Per-card select handler: clicking the active card just refreshes focus;
	// clicking any other card triggers the switch.
	const selectHandlers = useMemo(
		() =>
			Object.fromEntries(
				sorted.map(a => [
					a.id,
					(): void => {
						if (a.id === activeAccountId) {
							setFocusedId(a.id);
						} else {
							onSwitch(a.id);
						}
					},
				]),
			),
		[sorted, activeAccountId, onSwitch],
	);

	const focusHandlers = useMemo(
		() => Object.fromEntries(sorted.map(a => [a.id, (): void => setFocusedId(a.id)])),
		[sorted],
	);

	const handleAddFocus = useCallback(() => setFocusedId(null), []);

	useEffect(() => {
		// Spotlight may target cards before they mount; defer until after layout.
		const raf = requestAnimationFrame(() => Spotlight.focus(GRID_SPOTLIGHT_ID));
		return () => cancelAnimationFrame(raf);
	}, []);

	return (
		<GridContainer className={css.wrap} spotlightId={GRID_SPOTLIGHT_ID}>
			<h4 className={css.heading}>Accounts</h4>
			<div className={css.grid}>
				{sorted.map(a => (
					<div key={a.id} onFocus={focusHandlers[a.id]}>
						<AccountCard
							account={a}
							isActive={a.id === activeAccountId}
							isDefault={a.id === defaultAccountId}
							onSelect={selectHandlers[a.id] as (id: string) => void}
						/>
					</div>
				))}
				<SpottableDiv
					role="button"
					className={css.addTile}
					onClick={onAdd}
					onFocus={handleAddFocus}
				>
					<span className={css.addIcon}>+</span>
					<span>Add account</span>
				</SpottableDiv>
			</div>
			<AccountActionBar
				focusedAccountId={focusedId}
				activeAccountId={activeAccountId}
				defaultAccountId={defaultAccountId}
				onSwitch={onSwitch}
				onSetDefault={onSetDefault}
				onRemove={onRemove}
			/>
		</GridContainer>
	);
};
