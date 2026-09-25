import type React from 'react';
import Spottable from '@enact/spotlight/Spottable';
import type {SpottableProps} from '@enact/spotlight/Spottable';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';
import Spotlight from '@enact/spotlight';

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type SpottableDivProps = DivProps & SpottableProps;
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
type SpottableButtonProps = ButtonProps & SpottableProps;

export const SpottableDiv = Spottable('div') as React.ComponentType<SpottableDivProps>;
export const SpottableButton = Spottable('button') as React.ComponentType<SpottableButtonProps>;

interface SpotlightContainerOptions {
	enterTo?: 'last-focused' | 'default-element' | 'topmost';
}

interface SpotlightContainerProps extends DivProps {
	spotlightId?: string;
	spotlightRestrict?: 'none' | 'self-first' | 'self-only';
	spotlightDisabled?: boolean;
	spotlightMuted?: boolean;
}

// For handlers that consume a D-pad key before Spotlight sees it: Spotlight would have left
// pointer mode on that key, and while the Magic Remote cursor shows it refuses to move focus.
export function focusFromKey(spotlightId: string): void {
	Spotlight.setPointerMode(false);
	Spotlight.focus(spotlightId);
}

export function createSpotlightContainer(options: SpotlightContainerOptions = {}): React.ComponentType<SpotlightContainerProps> {
	return SpotlightContainerDecorator(options, 'div' as unknown as React.ComponentType<SpotlightContainerProps>);
}
