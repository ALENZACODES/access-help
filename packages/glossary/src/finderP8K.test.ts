import { describe, expect, it } from 'vitest';
import {
  SHORTCUTS_STORE_KEY,
  VISITS_STORE_KEY,
  mountPlaceFinder,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Lang,
  type Place,
} from './index';

const prov = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' } as const;
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
];
const today = '2026-11-15';

class El implements FinderElement {
  innerHTML = '';
  checked = false;
  value = '';
  focused = 0;
  focus(): void {
    this.focused += 1;
  }
}
type Listener = (e: { readonly target: unknown }) => void;
class Root implements FinderRoot {
  innerHTML = '';
  readonly els = new Map<string, El>();
  readonly handlers = new Map<string, Listener[]>();
  querySelector(selector: string): El {
    let el = this.els.get(selector);
    if (el === undefined) {
      el = new El();
      this.els.set(selector, el);
    }
    return el;
  }
  addEventListener(type: string, listener: Listener): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), listener]);
  }
  fire(type: string, target: unknown): void {
    for (const h of this.handlers.get(type) ?? []) h({ target });
  }
  key(key: string, extra: Record<string, unknown> = {}, target: unknown = { tagName: 'BODY' }): { prevented: boolean } {
    const state = { prevented: false };
    const event = { target, key, preventDefault: () => (state.prevented = true), ...extra };
    for (const h of this.handlers.get('keydown') ?? []) h(event);
    return state;
  }
}
class Mem implements IndexStore {
  readonly m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
}
const mount = (extra: Partial<Parameters<typeof mountPlaceFinder>[1]> = {}, lang: Lang = 'en') => {
  const root = new Root();
  const finder = mountPlaceFinder(root, { lang, places, today, ...extra });
  return { root, finder };
};
const said = (root: Root): string => root.querySelector('[data-gl-announce]').innerHTML;

describe('announcements', () => {
  it('says what saving did, and the opposite when saved again', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-save-1' });
    expect(said(root)).toBe('Saved Café Nord.');
    root.fire('click', { id: 'gl-save-1' });
    expect(said(root)).toBe('Removed Café Nord from saved places.');
  });
  it('changes the text on a repeat so a screen reader speaks it again', () => {
    const { root, finder } = mount();
    finder.clear();
    const first = said(root);
    finder.clear();
    expect(said(root)).not.toBe(first);
    expect(said(root).trim()).toBe(first.trim());
    finder.clear();
    expect(said(root)).toBe(first);
  });
  it('speaks in French', () => {
    const { root } = mount({}, 'fr');
    root.fire('click', { id: 'gl-save-1' });
    expect(said(root)).toBe('Café Nord enregistré.');
  });
  it('has the live region in the first paint', () => {
    expect(mount().root.innerHTML).toContain('data-gl-announce');
  });
  it('says what a quick choice did', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-grp-getting-in' });
    expect(said(root)).toBe('Chose features for Getting in.');
    root.fire('click', { id: 'gl-grp-getting-in' });
    expect(said(root)).toContain('Removed features for Getting in.');
  });
});

describe('undo', () => {
  it('has no button until there is something to undo', () => {
    expect(mount().root.querySelector('[data-gl-undo]').innerHTML).toBe('');
  });
  it('brings back cleared choices, the list settings and the search box', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-f-ramp', checked: true });
    root.fire('input', { id: 'gl-pq', value: 'lib' });
    root.fire('change', { id: 'gl-only-saved', checked: true });
    root.fire('click', { id: 'gl-clear' });
    expect(finder.getState().features).toEqual([]);
    expect(root.querySelector('[data-gl-undo]').innerHTML).toContain('Undo: clear choices');
    root.fire('click', { id: 'gl-undo' });
    expect(finder.getState()).toEqual({ features: ['ramp'], query: 'lib', hideNotAvailable: false });
    expect(finder.getView().savedOnly).toBe(true);
    expect(root.innerHTML).toContain('value="lib"');
    expect(root.innerHTML).toContain('id="gl-f-ramp" checked');
    expect(said(root)).toBe('Undone.');
  });
  it('offers nothing when there was nothing to clear', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-clear' });
    expect(root.querySelector('[data-gl-undo]').innerHTML).toBe('');
  });
  it('puts a removed saved place back where it was', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-save-0' });
    root.fire('click', { id: 'gl-save-1' });
    root.fire('click', { id: 'gl-save-0' });
    expect(finder.getSaved()).toEqual(['cafe']);
    expect(root.querySelector('[data-gl-undo]').innerHTML).toContain('Undo: remove saved place');
    root.fire('click', { id: 'gl-undo' });
    expect(finder.getSaved()).toEqual(['lib', 'cafe']);
  });
  it('brings back cleared recent searches', () => {
    const store = new Mem();
    const { root } = mount({ store });
    root.fire('change', { id: 'gl-pq', value: 'café' });
    root.fire('click', { id: 'gl-rs-clear' });
    root.fire('click', { id: 'gl-undo' });
    expect(root.querySelector('[data-gl-recent-searches]').innerHTML).toContain('id="gl-rs-0"');
    expect(JSON.parse(store.getItem('glossary-recent-searches') ?? '[]')).toEqual(['café']);
  });
  it('only undoes the last action, then the button goes away', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-save-0' });
    root.fire('click', { id: 'gl-save-0' });
    root.fire('click', { id: 'gl-undo' });
    expect(finder.getSaved()).toEqual(['lib']);
    expect(root.querySelector('[data-gl-undo]').innerHTML).toBe('');
    root.fire('click', { id: 'gl-undo' });
    expect(finder.getSaved()).toEqual(['lib']);
  });
  it('moves focus to the search box after undoing', () => {
    const { root } = mount();
    root.fire('change', { id: 'gl-hide', checked: true });
    root.fire('click', { id: 'gl-clear' });
    root.fire('click', { id: 'gl-undo' });
    expect(root.querySelector('#gl-pq').focused).toBeGreaterThan(0);
  });
});

describe('keyboard shortcuts', () => {
  it('are off at first: keys do nothing', () => {
    const { root, finder } = mount();
    expect(root.key('s').prevented).toBe(false);
    expect(finder.getView().savedOnly).toBe(false);
    expect(root.innerHTML).not.toContain('<kbd');
  });
  it('turn on with the switch, are remembered, and are announced', () => {
    const store = new Mem();
    const { root } = mount({ store });
    root.fire('change', { id: 'gl-shortcuts', checked: true });
    expect(store.getItem(SHORTCUTS_STORE_KEY)).toBe('on');
    expect(root.querySelector('[data-gl-shortcuts]').innerHTML).toContain('<kbd');
    expect(said(root)).toBe('Keyboard shortcuts are on.');
    expect(mount({ store }).root.innerHTML).toContain('id="gl-shortcuts" checked');
  });
  it('go to the search box with "/"', () => {
    const { root } = mount();
    root.fire('change', { id: 'gl-shortcuts', checked: true });
    expect(root.key('/').prevented).toBe(true);
    expect(root.querySelector('#gl-pq').focused).toBeGreaterThan(0);
  });
  it('toggle the list settings with "s" and "r"', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-shortcuts', checked: true });
    root.key('s');
    expect(finder.getView().savedOnly).toBe(true);
    expect(root.querySelector('#gl-only-saved').checked).toBe(true);
    root.key('s');
    expect(finder.getView().savedOnly).toBe(false);
    root.key('r');
    expect(finder.getView().recentOnly).toBe(true);
  });
  it('do nothing while typing in a field or with a modifier held', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-shortcuts', checked: true });
    expect(root.key('s', {}, { tagName: 'INPUT' }).prevented).toBe(false);
    expect(root.key('s', { ctrlKey: true }).prevented).toBe(false);
    expect(root.key('s', {}, { tagName: 'DIV', isContentEditable: true }).prevented).toBe(false);
    expect(finder.getView().savedOnly).toBe(false);
  });
  it('turn off again', () => {
    const { root, finder } = mount();
    root.fire('change', { id: 'gl-shortcuts', checked: true });
    root.fire('change', { id: 'gl-shortcuts', checked: false });
    root.key('s');
    expect(finder.getView().savedOnly).toBe(false);
    expect(said(root)).toBe('Keyboard shortcuts are off.');
  });
  it('ignore an event with no key', () => {
    const { root } = mount();
    root.fire('keydown', { tagName: 'BODY' });
    expect(root.innerHTML).not.toBe('');
  });
});

describe('visited places', () => {
  it('marks a place with today’s date and shows the note', () => {
    const store = new Mem();
    const { root } = mount({ store });
    root.fire('click', { id: 'gl-visit-0' });
    expect(JSON.parse(store.getItem(VISITS_STORE_KEY) ?? '{}')).toEqual({ lib: today });
    expect(root.querySelector('[data-gl-presults]').innerHTML).toContain(`You marked this place as visited on ${today}.`);
    expect(root.querySelector('[data-gl-presults]').innerHTML).toContain('id="gl-visit-0" data-visited="yes"');
    expect(said(root)).toBe('Marked Library as visited.');
  });
  it('removes the mark with a second press, and keeps focus on the button', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-visit-0' });
    root.fire('click', { id: 'gl-visit-0' });
    expect(root.querySelector('[data-gl-presults]').innerHTML).toContain('id="gl-visit-0" data-visited="no"');
    expect(root.querySelector('#gl-visit-0').focused).toBe(2);
    expect(said(root)).toBe('Removed the visit mark for Library.');
  });
  it('is remembered on the next visit', () => {
    const store = new Mem();
    mount({ store }).root.fire('click', { id: 'gl-visit-1' });
    expect(mount({ store }).root.innerHTML).toContain('id="gl-visit-1" data-visited="yes"');
  });
  it('ignores a place that is not there', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-visit-9' });
    expect(said(root)).toBe('');
  });
  it('shows nothing about the place itself', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-visit-0' });
    expect(root.querySelector('[data-gl-presults]').innerHTML).not.toMatch(/verified|accessible overall/i);
  });
});

describe('the tour', () => {
  it('opens at the first step and moves focus to the heading', () => {
    const { root } = mount();
    expect(root.querySelector('[data-gl-tour]').innerHTML).toBe('');
    root.fire('click', { id: 'gl-tour-open' });
    expect(root.querySelector('[data-gl-tour]').innerHTML).toContain('Step 1 of 5: Choose features');
    expect(root.querySelector('#gl-tour-title').focused).toBe(1);
  });
  it('goes forward and back', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-tour-open' });
    root.fire('click', { id: 'gl-tour-next' });
    expect(root.querySelector('[data-gl-tour]').innerHTML).toContain('Step 2 of 5');
    root.fire('click', { id: 'gl-tour-prev' });
    expect(root.querySelector('[data-gl-tour]').innerHTML).toContain('Step 1 of 5');
  });
  it('finishes after the last step and returns focus to the open button', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-tour-open' });
    for (let i = 0; i < 5; i += 1) root.fire('click', { id: 'gl-tour-next' });
    expect(root.querySelector('[data-gl-tour]').innerHTML).toBe('');
    expect(root.querySelector('#gl-tour-open').focused).toBe(1);
  });
  it('can be closed at any step', () => {
    const { root } = mount();
    root.fire('click', { id: 'gl-tour-open' });
    root.fire('click', { id: 'gl-tour-next' });
    root.fire('click', { id: 'gl-tour-close' });
    expect(root.querySelector('[data-gl-tour]').innerHTML).toBe('');
  });
  it('speaks French', () => {
    const { root } = mount({}, 'fr');
    root.fire('click', { id: 'gl-tour-open' });
    expect(root.querySelector('[data-gl-tour]').innerHTML).toContain('Étape 1 sur 5');
  });
  it('survives a language change while open', () => {
    const { root, finder } = mount();
    root.fire('click', { id: 'gl-tour-open' });
    finder.setLang('fr');
    expect(root.innerHTML).toContain('Étape 1 sur 5');
  });
});
