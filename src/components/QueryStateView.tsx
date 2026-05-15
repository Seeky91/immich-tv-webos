import React from 'react';
import {presentError} from '../utils/presentError';
import css from './QueryStateView.module.less';

interface QueryStateViewProps {
	isLoading: boolean;
	error: unknown;
	isEmpty?: boolean;
	loadingText?: string;
	errorText?: string;
	emptyText?: string;
	className?: string;
	children: React.ReactNode;
}

export const QueryStateView: React.FC<QueryStateViewProps> = ({
	isLoading,
	error,
	isEmpty = false,
	loadingText = 'Loading…',
	errorText,
	emptyText = 'Nothing here yet.',
	className,
	children,
}) => {
	const stateClass = className ? `${css.state} ${className}` : css.state;
	if (isLoading) return <div className={stateClass}>{loadingText}</div>;
	if (error) return <div className={stateClass}>{errorText ?? presentError(error)}</div>;
	if (isEmpty) return <div className={stateClass}>{emptyText}</div>;
	return <>{children}</>;
};

QueryStateView.displayName = 'QueryStateView';
