// Runtime polyfills for webOS 5.x (Chrome 68). Each polyfill is a feature-check
// guard so this file is a no-op on modern Chromium. Hand-rolled (no core-js) to
// keep the bundle small (~50 LOC of behavior vs ~140 KB of core-js/stable).
//
// APIs covered (Chrome version that introduced each):
//   Array.prototype.flat            (Chrome 69) — used in ImmichRepository
//   Array.prototype.flatMap         (Chrome 69) — used in TimelineGrid, MainPanel
//   Object.fromEntries              (Chrome 73) — used in NavigationRail
//   globalThis                      (Chrome 71) — used by @tanstack/query-core
//   Promise.allSettled              (Chrome 76) — safety
//   String.prototype.matchAll       (Chrome 73) — safety
//   Object.hasOwn                   (Chrome 93) — safety
//
// All assignments use `as any` casts because the TypeScript lib already declares
// these on the prototypes, and reassigning them in TS code requires the cast.

if (!Array.prototype.flat) {
	(Array.prototype as any).flat = function flat(depth = 1) {
		const flatten = (arr: any[], d: number): any[] =>
			d > 0
				? arr.reduce((acc: any[], val: any) => acc.concat(Array.isArray(val) ? flatten(val, d - 1) : val), [])
				: arr.slice();
		return flatten(this as any[], depth);
	};
}

if (!Array.prototype.flatMap) {
	(Array.prototype as any).flatMap = function flatMap(callback: (value: any, index: number, array: any[]) => any, thisArg?: any) {
		return (this as any[]).map(callback, thisArg).reduce((acc: any[], val: any) => acc.concat(val), []);
	};
}

if (!Object.fromEntries) {
	(Object as any).fromEntries = function fromEntries(entries: Iterable<readonly [PropertyKey, any]>) {
		const obj: Record<PropertyKey, any> = {};
		for (const [key, value] of entries as any) {
			obj[key] = value;
		}
		return obj;
	};
}

if (typeof globalThis === 'undefined') {
	// In a browser, `window` is the global. In a worker, `self` is.
	(function () {
		if (typeof window !== 'undefined') (window as any).globalThis = window;
		else if (typeof self !== 'undefined') (self as any).globalThis = self;
	})();
}

if (!Promise.allSettled) {
	(Promise as any).allSettled = function allSettled(promises: Iterable<Promise<any>>) {
		return Promise.all(
			Array.from(promises, (p) =>
				Promise.resolve(p).then(
					(value) => ({status: 'fulfilled' as const, value}),
					(reason) => ({status: 'rejected' as const, reason}),
				),
			),
		);
	};
}

if (!String.prototype.matchAll) {
	(String.prototype as any).matchAll = function* matchAll(regexp: RegExp) {
		const flags = regexp.flags.includes('g') ? regexp.flags : regexp.flags + 'g';
		const re = new RegExp(regexp.source, flags);
		let match;
		while ((match = re.exec(this as unknown as string)) !== null) {
			yield match;
		}
	};
}

if (!(Object as any).hasOwn) {
	(Object as any).hasOwn = function hasOwn(obj: object, prop: PropertyKey) {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	};
}
