import {useEffect} from 'react';
import type {RefObject} from 'react';
import Spotlight, {getDirection} from '@enact/spotlight';
import {spottableClass} from '@enact/spotlight/Spottable';
import {NAVIGATION_RAIL_SPOTLIGHT_ID} from '../utils/constants';

interface UseTimelineViewportFocusOptions {
	enabled: boolean;
	viewportRef: RefObject<HTMLElement | null>;
}

// Enact types getCurrent()/focus() around ReactNode, but at runtime they deal in DOM nodes.
const spotlight = Spotlight as unknown as {
	getCurrent(): HTMLElement | null;
	getPointerMode(): boolean;
	setPointerMode(pointerMode: boolean): void;
	focus(target: HTMLElement | string): boolean;
};

type Direction = 'up' | 'down' | 'left' | 'right';

// Two cards count as the same row when their top edges are within this many pixels.
const ROW_TOLERANCE_PX = 24;
// A card must clear the viewport edges by this margin to count as "in view".
const VISIBILITY_EPSILON_PX = 4;
// Breathing room left between a freshly focused card and the viewport edge when scrolling it in.
const SCROLL_MARGIN_PX = 16;

interface Card {
	el: HTMLElement;
	rect: DOMRect;
}

/**
 * D-pad navigation for the timeline grid.
 *
 * The AssetCards are absolutely-positioned children of the VirtualList's day-group items, not
 * VirtualList items themselves. Enact's scroll-on-focus (`calculatePositionOnFocus`) is index-based
 * and maps a focused card to the *top of its day-group*, so any focus move that needs a scroll snaps
 * the list to that group's top — the "jump to the top" bug (and its magic-remote wheel variant,
 * where focus is first lost off-screen).
 *
 * Rather than fight that math, this hook owns grid navigation: it computes the geometric neighbour
 * in the pressed direction among the rendered cards, focuses it with Enact's scroll-on-focus
 * suppressed, and scrolls it just into view itself (minimal + correct). It only declines — letting
 * Spotlight move focus out to the rail/header — at the grid's own edges.
 */
export const useTimelineViewportFocus = ({enabled, viewportRef}: UseTimelineViewportFocusOptions) => {
	useEffect(() => {
		if (!enabled) return undefined;

		const handleKeyDown = (event: KeyboardEvent) => {
			const dir = getDirection(event.keyCode) as Direction | false;
			if (!dir) return;
			// A modal owns 5-way navigation even if pointer movement temporarily blurred its
			// focused control. Re-anchoring the timeline here would consume the key before the
			// modal's own focus trap can recover.
			if (document.querySelector('[aria-modal="true"]')) return;
			const viewport = viewportRef.current;
			if (!viewport) return;

			const vr = viewport.getBoundingClientRect();
			// AppLayout parks inactive panels off-screen (left:-9999) rather than display:none, so
			// geometry — not offsetParent — tells us whether this grid is the visible one.
			if (vr.height === 0 || vr.right <= 0 || vr.left >= window.innerWidth) return;

			const current = spotlight.getCurrent();
			// Focus lives elsewhere on screen (rail, search input, header) — leave it to Spotlight.
			if (current && current !== document.body && document.contains(current) && !viewport.contains(current)) return;

			const cards = renderedCards(viewport);
			if (!cards.length) return;

			const focused = current && viewport.contains(current) ? current : null;

			// Focus was lost or scrolled off-screen (e.g. after a wheel scroll): re-anchor to the view.
			// Always take over here — handing a lost focus back to Spotlight is what makes it jump.
			if (!focused) {
				const anchor = topLeftInView(cards, vr) ?? nearestToView(cards, vr);
				if (!anchor) return;
				focusCard(anchor, viewport);
				consume(event);
				return;
			}

			const cr = focused.getBoundingClientRect();
			const target = pickNeighbour(cr, focused, dir, cards);
			if (target) {
				focusCard(target, viewport);
				consume(event);
				return;
			}

			// No card in that direction is rendered — handle the grid edges.
			const scrollNode = scrollNodeFor(focused, viewport);
			if (dir === 'down' && scrollNode && canScrollDown(scrollNode)) {
				scrollAndRefocus(scrollNode, viewport, cr, +1);
				consume(event);
			} else if (dir === 'up' && scrollNode && scrollNode.scrollTop > VISIBILITY_EPSILON_PX) {
				scrollAndRefocus(scrollNode, viewport, cr, -1);
				consume(event);
			} else if (dir === 'left') {
				// At the first card of any row, make the rail the explicit destination. Relying on
				// Spotlight's global geometry here is unreliable with the nested VirtualList.
				spotlight.setPointerMode(false);
				spotlight.focus(NAVIGATION_RAIL_SPOTLIGHT_ID);
				consume(event);
			} else if (dir === 'right') {
				consume(event); // right edge of a row: no-op rather than let Spotlight wrap-and-jump
			}
			// Up at the top falls through so Spotlight can exit to a view header when present.
		};

		// Capture phase + stopImmediatePropagation beats Spotlight, which listens for keydown on
		// window in the bubble phase (same trick as useAutoHideControls).
		window.addEventListener('keydown', handleKeyDown, {capture: true});
		return () => window.removeEventListener('keydown', handleKeyDown, {capture: true});
	}, [enabled, viewportRef]);
};

function consume(event: KeyboardEvent): void {
	event.preventDefault();
	event.stopImmediatePropagation();
}

function renderedCards(viewport: HTMLElement): Card[] {
	return Array.from(viewport.querySelectorAll<HTMLElement>(`.${spottableClass}`)).map((el) => ({el, rect: el.getBoundingClientRect()}));
}

// Top-most, then left-most, card whose top edge sits inside the viewport.
function topLeftInView(cards: Card[], vr: DOMRect): HTMLElement | null {
	let best: HTMLElement | null = null;
	let bestTop = Infinity;
	let bestLeft = Infinity;
	for (const {el, rect} of cards) {
		if (rect.top < vr.top - VISIBILITY_EPSILON_PX || rect.top >= vr.bottom) continue;
		if (rect.top < bestTop - ROW_TOLERANCE_PX || (rect.top <= bestTop + ROW_TOLERANCE_PX && rect.left < bestLeft)) {
			best = el;
			bestTop = rect.top;
			bestLeft = rect.left;
		}
	}
	return best;
}

// Fallback when no card sits inside the viewport (e.g. focus lost mid fast-scroll before the row
// under the fold has rendered): the rendered card closest to the viewport, which focusCard then
// brings fully into view.
function nearestToView(cards: Card[], vr: DOMRect): HTMLElement | null {
	let best: HTMLElement | null = null;
	let bestDist = Infinity;
	for (const {el, rect} of cards) {
		const dist = rect.bottom < vr.top ? vr.top - rect.bottom : rect.top > vr.bottom ? rect.top - vr.bottom : 0;
		if (dist < bestDist) {
			bestDist = dist;
			best = el;
		}
	}
	return best;
}

// Nearest card in the pressed direction: for up/down the closest row then closest column, for
// left/right the closest card on the same row.
function pickNeighbour(cr: DOMRect, focused: HTMLElement, dir: Direction, cards: Card[]): HTMLElement | null {
	const cx = cr.left + cr.width / 2;
	let best: HTMLElement | null = null;
	let bestScore = Infinity;
	for (const {el, rect} of cards) {
		if (el === focused) continue;
		const ex = rect.left + rect.width / 2;
		let score = Infinity;
		if (dir === 'down') {
			if (rect.top <= cr.top + ROW_TOLERANCE_PX) continue;
			score = (rect.top - cr.top) * 4 + Math.abs(ex - cx);
		} else if (dir === 'up') {
			if (rect.top >= cr.top - ROW_TOLERANCE_PX) continue;
			score = (cr.top - rect.top) * 4 + Math.abs(ex - cx);
		} else if (dir === 'right') {
			if (Math.abs(rect.top - cr.top) > ROW_TOLERANCE_PX || rect.left <= cr.left) continue;
			score = rect.left - cr.left;
		} else {
			if (Math.abs(rect.top - cr.top) > ROW_TOLERANCE_PX || rect.left >= cr.left) continue;
			score = cr.left - rect.left;
		}
		if (score < bestScore) {
			bestScore = score;
			best = el;
		}
	}
	return best;
}

// Focus a card without triggering Enact's (broken-for-us) scroll-on-focus, then scroll it into view
// ourselves. Focusing while pointer mode is on makes Enact's handleFocus skip its scrollTo; we flip
// straight back to 5-way so the focus ring shows.
function focusCard(el: HTMLElement, viewport: HTMLElement): void {
	spotlight.setPointerMode(true);
	spotlight.focus(el);
	spotlight.setPointerMode(false);
	// Scroll it into view ourselves, against the same viewport rect we measure with, so the card
	// clears the edges by SCROLL_MARGIN_PX rather than sitting flush (and possibly clipped).
	const scrollNode = scrollNodeFor(el, viewport);
	if (!scrollNode) return;
	const vr = viewport.getBoundingClientRect();
	const r = el.getBoundingClientRect();
	if (r.top < vr.top + SCROLL_MARGIN_PX) {
		scrollNode.scrollTop -= vr.top + SCROLL_MARGIN_PX - r.top;
	} else if (r.bottom > vr.bottom - SCROLL_MARGIN_PX) {
		scrollNode.scrollTop += r.bottom - (vr.bottom - SCROLL_MARGIN_PX);
	}
}

// The next row isn't rendered yet: scroll one row in `sign` direction, then focus the row that
// surfaces (after the list re-renders) nearest the previous column.
function scrollAndRefocus(scrollNode: HTMLElement, viewport: HTMLElement, cr: DOMRect, sign: 1 | -1): void {
	const cx = cr.left + cr.width / 2;
	scrollNode.scrollTop += sign * (cr.height + ROW_TOLERANCE_PX);
	requestAnimationFrame(() => {
		const vr = viewport.getBoundingClientRect();
		const cards = renderedCards(viewport);
		let best: HTMLElement | null = null;
		let bestScore = Infinity;
		for (const {el, rect} of cards) {
			if (rect.top < vr.top - VISIBILITY_EPSILON_PX || rect.bottom > vr.bottom + VISIBILITY_EPSILON_PX) continue;
			// Prefer the row nearest the edge we scrolled toward, then the nearest column.
			const edgeDist = sign > 0 ? vr.bottom - rect.bottom : rect.top - vr.top;
			const score = Math.max(0, edgeDist) + Math.abs(rect.left + rect.width / 2 - cx);
			if (score < bestScore) {
				bestScore = score;
				best = el;
			}
		}
		if (best) focusCard(best, viewport);
	});
}

function scrollNodeFor(el: HTMLElement, viewport: HTMLElement): HTMLElement | null {
	let node: HTMLElement | null = el;
	while (node && node !== viewport) {
		if (node.scrollHeight > node.clientHeight + VISIBILITY_EPSILON_PX) return node;
		node = node.parentElement;
	}
	return null;
}

function canScrollDown(scrollNode: HTMLElement): boolean {
	return scrollNode.scrollTop + scrollNode.clientHeight < scrollNode.scrollHeight - VISIBILITY_EPSILON_PX;
}
