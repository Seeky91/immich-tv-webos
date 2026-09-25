import React from 'react';
import Button from '@enact/sandstone/Button';
import css from './RoundButton.module.less';

interface RoundButtonProps {
	icon: string;
	tooltipText: string;
	onClick: () => void;
	spotlightId?: string;
	'data-spotlight-default-element'?: boolean;
}

/** Transparent icon button with a circular focus background, for the overlay action pills. */
export const RoundButton: React.FC<RoundButtonProps> = (props) => <Button {...props} css={css} size="small" backgroundOpacity="transparent" />;
