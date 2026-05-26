import React, {useCallback, useMemo, useState} from 'react';
import {AccountCard} from '../../components/AccountCard/AccountCard';
import {AccountActionBar} from '../../components/AccountActionBar/AccountActionBar';
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

	return (
		<div className={css.wrap}>
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
				<button className={css.addTile} onClick={onAdd} onFocus={handleAddFocus}>
					<span className={css.addIcon}>+</span>
					<span>Add account</span>
				</button>
			</div>
			<AccountActionBar
				focusedAccountId={focusedId}
				activeAccountId={activeAccountId}
				defaultAccountId={defaultAccountId}
				onSwitch={onSwitch}
				onSetDefault={onSetDefault}
				onRemove={onRemove}
			/>
		</div>
	);
};
