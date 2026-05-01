import type React from 'react';
import Spottable from '@enact/spotlight/Spottable';
import type {SpottableProps} from '@enact/spotlight/Spottable';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type SpottableDivProps = DivProps & SpottableProps;

export const SpottableDiv = Spottable('div') as React.ComponentType<SpottableDivProps>;

export interface SpotlightContainerOptions {
	enterTo?: 'last-focused' | 'default-element' | 'topmost';
}

export function createSpotlightContainer(options: SpotlightContainerOptions = {}): React.ComponentType<DivProps> {
	return SpotlightContainerDecorator(options, 'div' as unknown as React.ComponentType<DivProps>);
}
