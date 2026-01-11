import React from 'react';
import css from './DateHeader.module.less';

interface DateHeaderProps {
	displayDate: string;
	count: number;
}

export const DateHeader: React.FC<DateHeaderProps> = React.memo(({displayDate, count}) => {
	return (
		<div className={css.dateHeader} data-spotlight-disabled="true">
			{displayDate}
			<span className={css.count}> ({count})</span>
		</div>
	);
});

DateHeader.displayName = 'DateHeader';
