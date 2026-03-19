import React from 'react';
import {Panel, Header} from '@enact/sandstone/Panels';

const SearchPanel: React.FC = () => (
	<Panel>
		<Header title="Search" />
		<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
			<p>Coming soon</p>
		</div>
	</Panel>
);

export default SearchPanel;
