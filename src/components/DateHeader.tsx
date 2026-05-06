import React, {useMemo} from 'react';
import {formatBucketDate} from '../utils/FormattingService';
import css from './DateHeader.module.less';

interface DateHeaderProps {
	timeBucket: string;
	count: number;
}

export const DateHeader: React.FC<DateHeaderProps> = React.memo(({timeBucket, count}) => {
	const displayDate = useMemo(() => formatBucketDate(timeBucket), [timeBucket]);
	return (
		<div className={css.dateHeader} data-spotlight-disabled="true">
			{displayDate}
			<span className={css.count}> ({count})</span>
		</div>
	);
});

DateHeader.displayName = 'DateHeader';
