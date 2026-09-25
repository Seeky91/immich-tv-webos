import React, {useMemo} from 'react';
import {formatBucketDate} from '../utils/FormattingService';
import css from './DateHeader.module.less';

interface DateHeaderProps {
	timeBucket: string;
}

export const DateHeader: React.FC<DateHeaderProps> = React.memo(({timeBucket}) => {
	const displayDate = useMemo(() => formatBucketDate(timeBucket), [timeBucket]);
	return (
		<div className={css.dateHeader} data-spotlight-disabled="true">
			{displayDate}
		</div>
	);
});

DateHeader.displayName = 'DateHeader';
