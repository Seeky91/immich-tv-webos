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

// Spotlight.focus is a no-op while the Magic Remote cursor shows (pointer mode). Needed when a
// handler consumes the D-pad key that would have left pointer mode, or when an overlay opened by
// a pointer click must pull focus away from the element behind it.
export function forceFocus(spotlightId: string): void {
	Spotlight.setPointerMode(false);
	Spotlight.focus(spotlightId);
}

export function createSpotlightContainer(options: SpotlightContainerOptions = {}): React.ComponentType<SpotlightContainerProps> {
	return SpotlightContainerDecorator(options, 'div' as unknown as React.ComponentType<SpotlightContainerProps>);
}
