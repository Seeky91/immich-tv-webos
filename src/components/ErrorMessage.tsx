import React from 'react';
import {BodyText} from '@enact/sandstone/BodyText';
import Icon from '@enact/sandstone/Icon';

interface ErrorMessageProps {
	message: string;
	className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({message, className}) => {
	if (!message) return null;

	return (
		<BodyText className={className} size="small">
			<Icon size="small">alert02</Icon>
			{message}
		</BodyText>
	);
};
