import React from 'react';
import {presentError} from '../utils/presentError';

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
	if (isLoading) return <div className={className}>{loadingText}</div>;
	if (error) return <div className={className}>{errorText ?? presentError(error)}</div>;
	if (isEmpty) return <div className={className}>{emptyText}</div>;
	return <>{children}</>;
};

QueryStateView.displayName = 'QueryStateView';
