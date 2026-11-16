import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * The order of saved places is the order of the visit plan. These helpers let a person move a place
 * earlier or later. The order is the person's own choice; it says nothing about any place.
 */
export type MoveDirection = 'earlier' | 'later';

export const ORDER_UI = {
  en: {
    earlier: 'Earlier',
    later: 'Later',
    earlierLabel: (name: string): string => `Move ${name} earlier in the visit plan`,
    laterLabel: (name: string): string => `Move ${name} later in the visit plan`,
    group: 'Change the visit order',
  },
  fr: {
    earlier: 'Plus tôt',
    later: 'Plus tard',
    earlierLabel: (name: string): string => `Placer ${name} plus tôt dans le plan de visite`,
    laterLabel: (name: string): string => `Placer ${name} plus tard dans le plan de visite`,
    group: 'Changer l’ordre des visites',
  },
} as const;

/** Swaps two saved places. Unchanged when either is not saved or they are the same place. */
export function swapSaved(saved: readonly string[], a: string, b: string): readonly string[] {
  const i = saved.indexOf(a);
  const j = saved.indexOf(b);
  if (i < 0 || j < 0 || i === j) return saved;
  const next = [...saved];
  next[i] = b;
  next[j] = a;
  return next;
}

/** 1-based place of the id among the ids given, or 0 when it is not there. */
export function positionOf(ids: readonly string[], id: string): number {
  return ids.indexOf(id) + 1;
}

export function moveId(direction: MoveDirection, index: number): string {
  return `gl-${direction === 'earlier' ? 'up' : 'down'}-${index}`;
}

export function parseMoveId(id: string): { readonly direction: MoveDirection; readonly index: number } | null {
  const m = /^gl-(up|down)-(\d+)$/.exec(id);
  return m === null ? null : { direction: m[1] === 'up' ? 'earlier' : 'later', index: Number(m[2]) };
}

/**
 * The move buttons for one place in the plan. `position` is 1-based among the `count` places in the plan.
 * The first place has no "earlier" and the last has no "later", so every button on the page does something.
 */
export function renderMoveButtons(index: number, name: string, position: number, count: number, lang: Lang): string {
  const ui = ORDER_UI[lang];
  const fx = (s: string): string => (lang === 'fr' ? fixFrench(s) : s);
  const buttons: string[] = [];
  if (position > 1) buttons.push(`<button type="button" class="gl-btn" id="${moveId('earlier', index)}" aria-label="${escapeHtml(fx(ui.earlierLabel(name)))}">${escapeHtml(ui.earlier)}</button>`);
  if (position < count) buttons.push(`<button type="button" class="gl-btn" id="${moveId('later', index)}" aria-label="${escapeHtml(fx(ui.laterLabel(name)))}">${escapeHtml(ui.later)}</button>`);
  if (buttons.length === 0) return '';
  return `<div class="gl-actions" role="group" aria-label="${escapeHtml(ui.group)}">${buttons.join('')}</div>`;
}
