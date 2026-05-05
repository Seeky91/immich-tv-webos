import React from 'react';

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
	errorText = 'Something went wrong.',
	emptyText = 'Nothing here yet.',
	className,
	children,
}) => {
	if (isLoading) return <div className={className}>{loadingText}</div>;
	if (error) return <div className={className}>{errorText}</div>;
	if (isEmpty) return <div className={className}>{emptyText}</div>;
	return <>{children}</>;
};

QueryStateView.displayName = 'QueryStateView';
