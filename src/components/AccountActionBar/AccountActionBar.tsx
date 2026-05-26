import React, {useCallback} from 'react';
import Button from '@enact/sandstone/Button';
import css from './AccountActionBar.module.less';

interface Props {
	focusedAccountId: string | null;
	activeAccountId: string | null;
	defaultAccountId: string | null;
	onSwitch: (id: string) => void;
	onSetDefault: (id: string | null) => void;
	onRemove: (id: string) => void;
}

export const AccountActionBar: React.FC<Props> = ({
	focusedAccountId,
	activeAccountId,
	defaultAccountId,
	onSwitch,
	onSetDefault,
	onRemove,
}) => {
	const id = focusedAccountId;
	const isActive = id !== null && id === activeAccountId;
	const isDefault = id !== null && id === defaultAccountId;

	const handleSwitch = useCallback(() => {
		if (id) onSwitch(id);
	}, [id, onSwitch]);
	const handleSetDefault = useCallback(() => {
		onSetDefault(id);
	}, [id, onSetDefault]);
	const handleRemove = useCallback(() => {
		if (id) onRemove(id);
	}, [id, onRemove]);

	if (id === null) return null;

	return (
		<div className={css.bar}>
			{!isActive ? <Button onClick={handleSwitch}>Switch</Button> : null}
			<Button onClick={handleSetDefault} disabled={isDefault}>
				Set as default
			</Button>
			<Button onClick={handleRemove} backgroundOpacity="transparent">
				{isActive ? 'Sign out' : 'Remove'}
			</Button>
		</div>
	);
};
