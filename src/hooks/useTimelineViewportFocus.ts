import {useEffect} from 'react';
import type {RefObject} from 'react';
import Spotlight, {getDirection} from '@enact/spotlight';
import {spottableClass} from '@enact/spotlight/Spottable';
import {NAVIGATION_RAIL_ID} from '../utils/constants';

interface UseTimelineViewportFocusOptions {
	enabled: boolean;
	// The grid's scroll container.
	viewportRef: RefObject<HTMLElement | null>;
	rightEdgeSpotlightId?: string;
}

// Enact types getCurrent()/focus() around ReactNode, but at runtime they deal in DOM nodes.
const spotlight = Spotlight as unknown as {
	getCurrent(): HTMLElement | null;
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
 * Cards are absolutely positioned inside windowed day groups, which Spotlight's geometric
 * navigation can't scroll through. This hook owns grid navigation: it focuses the geometric
 * neighbour in the pressed direction among the rendered cards and scrolls it just into view.
 * It only declines — letting Spotlight move focus out to the rail, scrubber or a view header —
 * at the grid's own edges.
 *
 * Focus never moves into empty space: when the next rows belong to a month that is still
 * loading, the key waits for it, and a focused card that has left the viewport (wheel scroll,
 * scrubber jump) is never navigated from — the next key re-anchors on what is on screen.
 */
export const useTimelineViewportFocus = ({enabled, viewportRef, rightEdgeSpotlightId}: UseTimelineViewportFocusOptions) => {
	// Spotlight focuses without scrolling in this overflow container, including when it moves
	// focus in from outside (rail hand-back, last-focused restore after an overlay closes).
	useEffect(() => {
		const handleFocusIn = (event: FocusEvent) => {
			const viewport = viewportRef.current;
			const target = event.target;
			if (!viewport || !(target instanceof HTMLElement) || !viewport.contains(target)) return;
			const related = event.relatedTarget;
			if (related instanceof Node && viewport.contains(related)) return;
			scrollCardIntoView(target, viewport);
		};
		window.addEventListener('focusin', handleFocusIn);
		return () => window.removeEventListener('focusin', handleFocusIn);
	}, [viewportRef]);

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
			const focused = current && viewport.contains(current) ? current : null;
			const cr = focused?.getBoundingClientRect();

			// Focus was lost, or its card left the screen: re-anchor on what is on screen. Without
			// a visible card (a month still loading) the key is swallowed rather than handed to
			// Spotlight, which would navigate from the off-screen card and drag the view back.
			if (!focused || !cr || cr.bottom <= vr.top || cr.top >= vr.bottom) {
				if (!focused && !cards.length) return;
				const anchor = topLeftInView(cards, vr);
				if (anchor) focusCard(anchor, viewport);
				consume(event);
				return;
			}

			const target = pickNeighbour(cr, focused, dir, cards);
			if (target) {
				focusCard(target, viewport);
				consume(event);
				return;
			}

			// No card in that direction — the grid's edges.
			if (dir === 'left') {
				// At the first card of any row, make the rail the explicit destination. Relying on
				// Spotlight's global geometry here is unreliable with the nested grid.
				spotlight.setPointerMode(false);
				spotlight.focus(`#${NAVIGATION_RAIL_ID}`);
			} else if (dir === 'right') {
				if (rightEdgeSpotlightId) {
					spotlight.setPointerMode(false);
					spotlight.focus(rightEdgeSpotlightId);
				}
			} else if (dir === 'up' && isFirstRow(viewport, vr, cr)) {
				// Reveal the first date header, then let Spotlight exit to a view header.
				if (viewport.scrollTop <= VISIBILITY_EPSILON_PX) return;
				viewport.scrollTop = 0;
			}
			// Down at the end, or towards rows still loading or not mounted yet: stay put rather
			// than let Spotlight pick an unrelated control or move focus into empty space.
			consume(event);
		};

		// Capture phase + stopImmediatePropagation beats Spotlight, which listens for keydown on
		// window in the bubble phase (same trick as useAutoHideControls).
		window.addEventListener('keydown', handleKeyDown, {capture: true});
		return () => window.removeEventListener('keydown', handleKeyDown, {capture: true});
	}, [enabled, rightEdgeSpotlightId, viewportRef]);
};

/** Focuses `preferred` when given and rendered, otherwise the card that best represents the view. */
export function focusTimelineViewport(viewport: HTMLElement, preferred?: HTMLElement | null): boolean {
	const viewportRect = viewport.getBoundingClientRect();
	const cards = renderedCards(viewport);
	const target = preferred ?? topLeftInView(cards, viewportRect) ?? nearestToView(cards, viewportRect);
	if (!target) return false;
	focusCard(target, viewport);
	return true;
}

function consume(event: KeyboardEvent): void {
	event.preventDefault();
	event.stopImmediatePropagation();
}

function renderedCards(viewport: HTMLElement): Card[] {
	return Array.from(viewport.querySelectorAll<HTMLElement>(`.${spottableClass}`)).map((el) => ({el, rect: el.getBoundingClientRect()}));
}

// Decided from the scroll offset, not from what is rendered: the render window can trail a
// fast scroll by a few rows, and those rows must read as "not there yet", never as the top.
function isFirstRow(viewport: HTMLElement, vr: DOMRect, cr: DOMRect): boolean {
	const contentOffset = viewport.scrollTop + cr.top - vr.top;
	return contentOffset < vr.height / 2;
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

// Explicit returns to the grid (scrubber exit) when no card sits inside the viewport: the
// rendered card closest to it, which focusCard then brings fully into view.
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

// Scroll a card into view against the viewport rect, clearing the edges by SCROLL_MARGIN_PX
// rather than sitting flush (and possibly clipped).
function scrollCardIntoView(el: HTMLElement, viewport: HTMLElement): void {
	const vr = viewport.getBoundingClientRect();
	const r = el.getBoundingClientRect();
	if (r.top < vr.top + SCROLL_MARGIN_PX) {
		viewport.scrollTop -= vr.top + SCROLL_MARGIN_PX - r.top;
	} else if (r.bottom > vr.bottom - SCROLL_MARGIN_PX) {
		viewport.scrollTop += r.bottom - (vr.bottom - SCROLL_MARGIN_PX);
	}
}

// Spotlight refuses programmatic focus while the pointer is visible (also on desktop): enter
// 5-way first.
function focusCard(el: HTMLElement, viewport: HTMLElement): void {
	spotlight.setPointerMode(false);
	spotlight.focus(el);
	scrollCardIntoView(el, viewport);
}
