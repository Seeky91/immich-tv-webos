import React from 'react';
import Scroller from '@enact/sandstone/Scroller';
import css from './CollectionGrid.module.less';

interface CollectionGridProps {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}

/** Scrollable page of poster cards (albums, places) under a page title. */
export const CollectionGrid: React.FC<CollectionGridProps> = ({title, subtitle, children}) => (
	<Scroller direction="vertical" scrollMode="native" verticalScrollbar="hidden" className={css.scroller}>
		<div className={css.page}>
			<div className={css.header}>
				<span className={css.title}>{title}</span>
				{subtitle && <span className={css.subtitle}>{subtitle}</span>}
			</div>
			<div className={css.grid}>{children}</div>
		</div>
	</Scroller>
);

CollectionGrid.displayName = 'CollectionGrid';
