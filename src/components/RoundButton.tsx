import React from 'react';
import Button from '@enact/sandstone/Button';
import css from './RoundButton.module.less';

interface RoundButtonProps {
	icon?: string;
	children?: React.ReactNode;
	tooltipText: string;
	onClick: () => void;
	spotlightId?: string;
	'data-spotlight-default-element'?: boolean;
}

/** Transparent overlay button: circular focus background for an icon, pill-shaped for a short label. */
export const RoundButton: React.FC<RoundButtonProps> = (props) => (
	<Button {...props} css={css} size="small" backgroundOpacity="transparent" minWidth={false} />
);
