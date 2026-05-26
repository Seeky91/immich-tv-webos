import React, {useCallback, useMemo} from 'react';
import type {Account} from '../../utils/accountsStore';
import {deriveLabel, pickGradient} from '../../utils/accountVisual';
import css from './AccountCard.module.less';

interface AccountCardProps {
	account: Account;
	isActive: boolean;
	isDefault: boolean;
	onSelect: (id: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({account, isActive, isDefault, onSelect}) => {
	const label = useMemo(() => deriveLabel(account), [account]);
	const gradient = useMemo(() => pickGradient(account.id), [account.id]);
	const letter = useMemo(() => (label.match(/\S/)?.[0] ?? '?').toUpperCase(), [label]);
	const handleClick = useCallback(() => onSelect(account.id), [account.id, onSelect]);

	const host = useMemo(() => {
		try {
			return new URL(account.baseUrl).hostname;
		} catch {
			return account.baseUrl;
		}
	}, [account.baseUrl]);

	return (
		<button
			className={[css.card, isActive ? css.active : ''].filter(Boolean).join(' ')}
			onClick={handleClick}
		>
			{isDefault ? <span className={css.badge}>DEFAULT</span> : null}
			<div className={css.avatar} style={{background: gradient}}>
				{letter}
			</div>
			<div className={css.label}>{label}</div>
			<div className={css.host}>{host}</div>
		</button>
	);
};
