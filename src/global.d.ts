/// <reference types="react" />
/// <reference types="react-dom" />

declare const ENACT_PACK_ISOMORPHIC: boolean;

declare module '*.module.less' {
	const classes: {[key: string]: string};
	export default classes;
}

declare module '*.less' {
	const content: {[key: string]: string};
	export default content;
}

declare module '*.png' {
	const value: string;
	export default value;
}

declare module '*.jpg' {
	const value: string;
	export default value;
}

declare module '*.jpeg' {
	const value: string;
	export default value;
}

declare module '*.svg' {
	const value: string;
	export default value;
}

interface ImportMetaEnv {
	DEV?: boolean;
	PROD?: boolean;
	MODE?: string;
}

interface ImportMeta {
	env: ImportMetaEnv;
}
