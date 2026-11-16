import { describe, expect, it } from 'vitest';
import {
  DAYS_STORE_KEY,
  MUST_STORE_KEY,
  QUIZ_BEST_KEY,
  mountPlaceFinder,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [yes('elevator')] },
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
interface Opts {
  lang?: Lang;
  store?: Mem;
  exports?: ExportFile[];
}
const mount = (o: Opts = {}) => {
  const root = new Root();
  const store = o.store ?? new Mem();
  const finder = mountPlaceFinder(root, {
    lang: o.lang ?? 'en',
    places,
    today,
    store,
    ...(o.exports === undefined ? {} : { onExport: (f: ExportFile) => o.exports?.push(f) }),
  });
  return { root, finder, store };
};
type M = ReturnType<typeof mount>;
const region = (root: Root, selector: string): string => root.querySelector(selector).innerHTML;
const spoken = (root: Root): string => region(root, '[data-gl-announce]');
const save = (m: M, ...indexes: number[]): void => {
  for (const i of indexes) m.root.fire('click', { id: `gl-save-${i}` });
};



const spokenText = (root: Root): string => region(root, '[data-gl-announce]');
const press = (m: M, id: string): void => m.root.fire('click', { id });
const check = (m: M, term: string, on: boolean): void => m.root.fire('change', { id: `gl-must-${term}`, checked: on });

describe('must-haves', () => {
  it('has a panel with a check box for each feature', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('class="gl-must-panel"');
    expect(m.root.innerHTML).toContain('id="gl-must-ramp"');
    expect(m.root.innerHTML).toContain('Choose at least one feature above.');
  });
  it('adds a must-have, saves it, lists the places in order and says so', () => {
    const m = mount();
    check(m, 'ramp', true);
    expect(m.finder.getMust()).toEqual(['ramp']);
    expect(JSON.parse(m.store.getItem(MUST_STORE_KEY) ?? '[]')).toEqual(['ramp']);
    const panel = region(m.root, '[data-gl-must]');
    expect(panel).toContain('4 places, best match first.');
    expect(panel.indexOf('Library')).toBeLessThan(panel.indexOf('Pool'));
    expect(spokenText(m.root)).toBe('Added Ramp to your must-haves.');
    expect(m.root.querySelector('#gl-must-ramp').focused).toBe(1);
  });
  it('puts a count under each place card', () => {
    const m = mount();
    check(m, 'ramp', true);
    check(m, 'elevator', true);
    const list = region(m.root, '[data-gl-presults]');
    expect(list).toContain('Your must-haves: 1 of 2 reported as available, 1 unknown.');
    expect(list).toContain('Your must-haves: 0 of 2 reported as available, 2 unknown.');
  });
  it('removes a must-have and clears the card lines', () => {
    const m = mount();
    check(m, 'ramp', true);
    check(m, 'ramp', false);
    expect(m.finder.getMust()).toEqual([]);
    expect(region(m.root, '[data-gl-presults]')).not.toContain('Your must-haves');
    expect(spokenText(m.root)).toBe('Removed Ramp from your must-haves.');
  });
  it('does nothing when the box already has that value, or for an unknown feature', () => {
    const m = mount();
    check(m, 'ramp', false);
    check(m, 'nope', true);
    expect(m.finder.getMust()).toEqual([]);
    expect(m.store.getItem(MUST_STORE_KEY)).toBeNull();
  });
  it('shows the place when Show is pressed', () => {
    const m = mount();
    check(m, 'elevator', true);
    press(m, 'gl-mshow-3');
    expect(m.root.querySelector('#gl-pq').value).toBe('Hall');
  });
  it('does not call a place with unknowns available', () => {
    const m = mount();
    check(m, 'ramp', true);
    check(m, 'grab-bar', true);
    expect(region(m.root, '[data-gl-must]').split('<ol>')[1]).not.toMatch(/accessible|verified/i);
    expect(region(m.root, '[data-gl-presults]')).toContain('1 of 2 reported as available, 1 unknown.');
  });
  it('is read back from storage and ignores bad storage', () => {
    const store = new Mem();
    check(mount({ store }), 'ramp', true);
    expect(mount({ store }).finder.getMust()).toEqual(['ramp']);
    store.setItem(MUST_STORE_KEY, '{}');
    expect(mount({ store }).finder.getMust()).toEqual([]);
  });
  it('goes into the backup and comes back, and forget removes it', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    check(a, 'ramp', true);
    press(a, 'gl-backup-export');
    const b = mount({ exports: [] });
    b.root.querySelector('#gl-backup-text').value = files[0]?.text ?? '';
    press(b, 'gl-backup-import');
    expect(b.finder.getMust()).toEqual(['ramp']);
    expect(JSON.parse(b.store.getItem(MUST_STORE_KEY) ?? '[]')).toEqual(['ramp']);
    press(b, 'gl-forget');
    press(b, 'gl-forget-sure');
    expect(b.finder.getMust()).toEqual([]);
    expect(b.store.getItem(MUST_STORE_KEY)).toBe('[]');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    check(m, 'ramp', true);
    expect(spokenText(m.root)).toBe('Rampe ajouté à vos incontournables.');
    expect(region(m.root, '[data-gl-presults]')).toContain('1 sur 1 signalée comme disponible');
  });
});

describe('week plan', () => {
  const setDayFor = (m: M, i: number, v: string): void => m.root.fire('change', { id: `gl-day-${i}`, value: v });
  it('has a week panel and no day box until a place is saved', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('class="gl-week-panel"');
    expect(m.root.innerHTML).not.toContain('id="gl-day-0"');
    expect(m.root.innerHTML).toContain('No places planned yet.');
  });
  it('shows the day box under a saved place', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-save-0' });
    expect(region(m.root, '[data-gl-presults]')).toContain('id="gl-day-0"');
    expect(region(m.root, '[data-gl-presults]')).not.toContain('id="gl-day-1"');
  });
  it('sets a day, saves it, shows it in the week and says so', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-save-0' });
    setDayFor(m, 0, 'sun');
    expect(m.finder.getDays()).toEqual({ lib: 'sun' });
    expect(JSON.parse(m.store.getItem(DAYS_STORE_KEY) ?? '{}')).toEqual({ lib: 'sun' });
    const week = region(m.root, '[data-gl-week]');
    expect(week).toContain('<h4>Sunday (today)</h4>');
    expect(week).toContain('1 place planned.');
    expect(spokenText(m.root)).toBe('Library is planned for Sunday.');
    expect(m.root.querySelector('#gl-day-0').focused).toBe(1);
  });
  it('changes and clears a day', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-save-1' });
    setDayFor(m, 1, 'wed');
    setDayFor(m, 1, 'fri');
    expect(m.finder.getDays()).toEqual({ cafe: 'fri' });
    setDayFor(m, 1, '');
    expect(m.finder.getDays()).toEqual({});
    expect(spokenText(m.root)).toBe('Removed the day for Café Nord.');
  });
  it('ignores a value that is not a day, the same day again and a place that is not there', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-save-0' });
    setDayFor(m, 0, 'someday');
    setDayFor(m, 99, 'mon');
    setDayFor(m, 0, 'mon');
    const stored = m.store.getItem(DAYS_STORE_KEY);
    setDayFor(m, 0, 'mon');
    expect(m.store.getItem(DAYS_STORE_KEY)).toBe(stored);
    expect(m.finder.getDays()).toEqual({ lib: 'mon' });
  });
  it('shows the place when Show is pressed', () => {
    const m = mount();
    m.root.fire('click', { id: 'gl-save-2' });
    setDayFor(m, 2, 'sat');
    press(m, 'gl-dyshow-2');
    expect(m.root.querySelector('#gl-pq').value).toBe('Pool');
  });
  it('copies the week as text only with a host that takes files', () => {
    const none = mount();
    none.root.fire('click', { id: 'gl-save-0' });
    setDayFor(none, 0, 'wed');
    expect(region(none.root, '[data-gl-week]')).not.toContain('gl-day-export');
    press(none, 'gl-day-export');
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    m.root.fire('click', { id: 'gl-save-0' });
    m.root.fire('click', { id: 'gl-save-3' });
    setDayFor(m, 0, 'wed');
    setDayFor(m, 3, 'mon');
    press(m, 'gl-day-export');
    expect(files[0]?.filename).toBe('my-week-en.txt');
    expect(files[0]?.text).toBe('My week\n\nMonday 2026-11-16\n- Hall\n\nWednesday 2026-11-18\n- Library\n');
  });
  it('is read back from storage and ignores bad storage', () => {
    const store = new Mem();
    const a = mount({ store });
    a.root.fire('click', { id: 'gl-save-0' });
    setDayFor(a, 0, 'tue');
    expect(mount({ store }).finder.getDays()).toEqual({ lib: 'tue' });
    store.setItem(DAYS_STORE_KEY, '[]');
    expect(mount({ store }).finder.getDays()).toEqual({});
  });
  it('goes into the backup and comes back, and forget removes it', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    a.root.fire('click', { id: 'gl-save-0' });
    setDayFor(a, 0, 'thu');
    press(a, 'gl-backup-export');
    const b = mount({ exports: [] });
    b.root.querySelector('#gl-backup-text').value = files[0]?.text ?? '';
    press(b, 'gl-backup-import');
    expect(b.finder.getDays()).toEqual({ lib: 'thu' });
    press(b, 'gl-forget');
    press(b, 'gl-forget-sure');
    expect(b.finder.getDays()).toEqual({});
    expect(b.store.getItem(DAYS_STORE_KEY)).toBe('{}');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    m.root.fire('click', { id: 'gl-save-0' });
    setDayFor(m, 0, 'sun');
    expect(spokenText(m.root)).toBe('Library est prévu pour dimanche.');
    expect(region(m.root, '[data-gl-week]')).toContain('<h4>Dimanche (aujourd’hui)</h4>');
  });
});

describe('quiz', () => {
  /** The word buttons now showing (from the panel once it has been drawn, else from the page). */
  const options = (m: M): string[] => {
    const html = region(m.root, '[data-gl-quiz]') || m.root.innerHTML;
    return [...html.matchAll(/id="gl-quiz-opt-([a-z-]+)"/g)].map((x) => x[1] ?? '');
  };
  const firstOption = (m: M): string => `gl-quiz-opt-${options(m)[0] ?? ''}`;
  const wrongOption = (m: M): string => `gl-quiz-opt-${options(m).find((o) => o !== 'unknown') ?? ''}`;
  it('has a panel with the first question', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('class="gl-quiz-panel"');
    expect(m.root.innerHTML).toContain('Question 1 of ');
    expect(m.root.innerHTML).toContain('We do not have information about this.');
  });
  it('says a right answer is right, and points to Next', () => {
    const m = mount();
    press(m, 'gl-quiz-opt-unknown');
    expect(spokenText(m.root)).toBe('Correct.');
    expect(region(m.root, '[data-gl-quiz]')).toContain('Correct.');
    expect(region(m.root, '[data-gl-quiz]')).toContain('gl-quiz-next');
    expect(m.root.querySelector('#gl-quiz-next').focused).toBe(1);
  });
  it('says a wrong answer is wrong, and what the answer was', () => {
    const m = mount();
    press(m, wrongOption(m));
    const panel = region(m.root, '[data-gl-quiz]');
    expect(spokenText(m.root)).toBe('Not quite. The answer is Unknown.');
    expect(panel).toContain('(Your answer)');
    expect(panel).toContain('(Right answer)');
  });
  it('counts only the first answer', () => {
    const m = mount();
    const wrong = wrongOption(m);
    press(m, wrong);
    press(m, 'gl-quiz-opt-unknown');
    expect(region(m.root, '[data-gl-quiz]')).toContain('Not quite');
  });
  it('ignores a word that is not on offer, and Next before an answer', () => {
    const m = mount();
    press(m, 'gl-quiz-opt-zzz');
    press(m, 'gl-quiz-next');
    expect(m.root.innerHTML).toContain('Question 1 of ');
  });
  it('goes on to the next question and moves focus to its first word', () => {
    const m = mount();
    press(m, 'gl-quiz-opt-unknown');
    press(m, 'gl-quiz-next');
    expect(region(m.root, '[data-gl-quiz]')).toContain('Question 2 of ');
    expect(m.root.querySelector(`#${firstOption(m)}`).focused).toBe(1);
  });
  it('plays to the end, shows the score, saves the best and can start again', () => {
    const m = mount();
    let guard = 0;
    while (!region(m.root, '[data-gl-quiz]').includes('You got') && guard < 40) {
      guard += 1;
      press(m, firstOption(m));
      press(m, 'gl-quiz-next');
    }
    const end = region(m.root, '[data-gl-quiz]');
    expect(end).toMatch(/You got \d+ of \d+\./);
    expect(end).toContain('Your best so far is');
    expect(JSON.parse(m.store.getItem(QUIZ_BEST_KEY) ?? 'null')).toMatchObject({ total: 9 });
    press(m, 'gl-quiz-again');
    expect(region(m.root, '[data-gl-quiz]')).toContain('Question 1 of ');
  });
  it('keeps the best score for the next visit, and ignores bad storage', () => {
    const store = new Mem();
    store.setItem(QUIZ_BEST_KEY, JSON.stringify({ score: 7, total: 9 }));
    expect(mount({ store }).root.innerHTML).toContain('Your best so far is 7 of 9.');
    store.setItem(QUIZ_BEST_KEY, 'nope');
    expect(mount({ store }).root.innerHTML).not.toContain('Your best so far');
  });
  it('is cleared by forget', () => {
    const store = new Mem();
    store.setItem(QUIZ_BEST_KEY, JSON.stringify({ score: 7, total: 9 }));
    const m = mount({ store });
    press(m, 'gl-forget');
    press(m, 'gl-forget-sure');
    expect(store.getItem(QUIZ_BEST_KEY)).toBe('null');
    expect(region(m.root, '[data-gl-quiz]')).not.toContain('Your best so far');
  });
  it('says nothing about any place', () => {
    const m = mount();
    press(m, 'gl-quiz-opt-unknown');
    expect(region(m.root, '[data-gl-quiz]')).not.toMatch(/accessible|verified/i);
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    press(m, 'gl-quiz-opt-unknown');
    expect(spokenText(m.root)).toBe('Bonne réponse.');
    expect(m.root.innerHTML).toContain('Question 1 sur ');
  });
});

describe('undo for tags, dates and days', () => {
  const undoShown = (m: M): string => region(m.root, '[data-gl-undo]');
  it('puts a removed tag back where it was', () => {
    const m = mount();
    for (const t of ['a', 'b', 'c']) {
      m.root.querySelector('#gl-tag-0').value = t;
      press(m, 'gl-tagadd-0');
    }
    press(m, 'gl-untag-0-1');
    expect(undoShown(m)).toContain('Undo: remove tag');
    press(m, 'gl-undo');
    expect(m.finder.getTags()).toEqual({ lib: ['a', 'b', 'c'] });
    expect(JSON.parse(m.store.getItem('glossary-place-tags') ?? '{}')).toEqual({ lib: ['a', 'b', 'c'] });
    expect(undoShown(m)).toBe('');
    expect(spokenText(m.root)).toBe('Undone.');
  });
  it('puts a cleared date back', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-due-0', value: '2026-12-01' });
    press(m, 'gl-dueclear-0');
    expect(undoShown(m)).toContain('Undo: clear date');
    press(m, 'gl-undo');
    expect(m.finder.getReminders()).toEqual({ lib: '2026-12-01' });
  });
  it('offers no undo when there was no date to clear', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-due-0', value: '' });
    expect(undoShown(m)).toBe('');
  });
  it('puts a cleared day back', () => {
    const m = mount();
    press(m, 'gl-save-0');
    m.root.fire('change', { id: 'gl-day-0', value: 'wed' });
    m.root.fire('change', { id: 'gl-day-0', value: '' });
    expect(undoShown(m)).toContain('Undo: clear day');
    press(m, 'gl-undo');
    expect(m.finder.getDays()).toEqual({ lib: 'wed' });
  });
  it('offers only the last action', () => {
    const m = mount();
    m.root.querySelector('#gl-tag-0').value = 'a';
    press(m, 'gl-tagadd-0');
    press(m, 'gl-untag-0-0');
    m.root.fire('change', { id: 'gl-due-1', value: '2026-12-01' });
    m.root.fire('change', { id: 'gl-due-1', value: '' });
    press(m, 'gl-undo');
    expect(m.finder.getTags()).toEqual({});
    expect(m.finder.getReminders()).toEqual({ cafe: '2026-12-01' });
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    m.root.querySelector('#gl-tag-0').value = 'a';
    press(m, 'gl-tagadd-0');
    press(m, 'gl-untag-0-0');
    expect(undoShown(m)).toContain('Annuler\u00a0: retirer l’étiquette');
  });
});
