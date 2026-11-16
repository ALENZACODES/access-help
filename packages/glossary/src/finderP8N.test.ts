import { describe, expect, it } from 'vitest';
import {
  PRACTICE_STORE_KEY,
  REMINDERS_STORE_KEY,
  TAGS_STORE_KEY,
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
const tagBox = (m: M, i: number, text: string): void => {
  m.root.querySelector(`#gl-tag-${i}`).value = text;
  m.root.fire('click', { id: `gl-tagadd-${i}` });
};

describe('tags', () => {
  it('has a tag box under each place and a tags panel in the shell', () => {
    const m = mount();
    m.finder.setLang('en');
    expect(m.root.innerHTML).toContain('class="gl-tags-panel"');
    expect(m.root.innerHTML).toContain('data-gl-tags');
    expect(m.root.innerHTML).toContain('id="gl-tag-0"');
  });
  it('adds a tag, saves it, shows it as a chip and says so', () => {
    const m = mount();
    tagBox(m, 0, '  with Sam ');
    expect(m.finder.getTags()).toEqual({ lib: ['with Sam'] });
    expect(JSON.parse(m.store.getItem(TAGS_STORE_KEY) ?? '{}')).toEqual({ lib: ['with Sam'] });
    expect(region(m.root, '[data-gl-presults]')).toContain('id="gl-untag-0-0"');
    expect(spokenText(m.root)).toBe('Added the tag with Sam to Library.');
  });
  it('puts focus back in the tag box', () => {
    const m = mount();
    tagBox(m, 1, 'spring');
    expect(m.root.querySelector('#gl-tag-1').focused).toBe(1);
  });
  it('says so for an empty tag and for the same tag again, and changes nothing', () => {
    const m = mount();
    tagBox(m, 0, '   ');
    expect(spokenText(m.root)).toBe('Type a tag first.');
    tagBox(m, 0, 'Spring');
    tagBox(m, 0, 'spring');
    expect(spokenText(m.root)).toBe('Library already has that tag.');
    expect(m.finder.getTags()).toEqual({ lib: ['Spring'] });
  });
  it('stops at five tags', () => {
    const m = mount();
    for (const t of ['a', 'b', 'c', 'd', 'e', 'f']) tagBox(m, 0, t);
    expect(m.finder.getTags().lib).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(spokenText(m.root)).toBe('Library has the most tags allowed. Remove one first.');
  });
  it('removes a tag and says so', () => {
    const m = mount();
    tagBox(m, 0, 'a');
    tagBox(m, 0, 'b');
    m.root.fire('click', { id: 'gl-untag-0-0' });
    expect(m.finder.getTags()).toEqual({ lib: ['b'] });
    expect(spokenText(m.root)).toBe('Removed the tag a from Library.');
    m.root.fire('click', { id: 'gl-untag-0-0' });
    expect(m.finder.getTags()).toEqual({});
  });
  it('ignores a tag for a place or a tag that is not there', () => {
    const m = mount();
    tagBox(m, 99, 'x');
    m.root.fire('click', { id: 'gl-untag-0-3' });
    m.root.fire('click', { id: 'gl-untag-99-0' });
    expect(m.finder.getTags()).toEqual({});
  });
  it('lists the tags in use in the panel and the places with the chosen tag', () => {
    const m = mount();
    tagBox(m, 0, 'spring');
    tagBox(m, 2, 'Spring');
    tagBox(m, 2, 'with Sam');
    const panel = region(m.root, '[data-gl-tags]');
    expect(panel).toContain('<option value="spring">spring (2)</option>');
    expect(panel).toContain('with Sam (1)');
    m.root.fire('change', { id: 'gl-tagfilter', value: 'spring' });
    const chosen = region(m.root, '[data-gl-tags]');
    expect(chosen).toContain('2 places have the tag spring.');
    expect(chosen).toContain('id="gl-tshow-0"');
    expect(chosen).toContain('id="gl-tshow-2"');
  });
  it('keeps the chosen tag when another tag is added, and drops it when it is no longer used', () => {
    const m = mount();
    tagBox(m, 0, 'spring');
    m.root.fire('change', { id: 'gl-tagfilter', value: 'spring' });
    tagBox(m, 1, 'other');
    expect(region(m.root, '[data-gl-tags]')).toContain('<option value="spring" selected>');
    m.root.fire('click', { id: 'gl-untag-0-0' });
    expect(region(m.root, '[data-gl-tags]')).not.toContain('selected');
    expect(region(m.root, '[data-gl-tags]')).not.toContain('gl-tshow-');
  });
  it('puts the place name in the name search when Show is pressed', () => {
    const m = mount();
    tagBox(m, 1, 'spring');
    m.root.fire('change', { id: 'gl-tagfilter', value: 'spring' });
    m.root.fire('click', { id: 'gl-tshow-1' });
    expect(m.root.querySelector('#gl-pq').value).toBe('Café Nord');
    expect(m.root.querySelector('#gl-pq').focused).toBe(1);
  });
  it('is read back from storage', () => {
    const store = new Mem();
    tagBox(mount({ store }), 3, 'hall');
    expect(mount({ store }).finder.getTags()).toEqual({ hall: ['hall'] });
  });
  it('is ignored when the stored text is bad', () => {
    const store = new Mem();
    store.setItem(TAGS_STORE_KEY, 'nope');
    expect(mount({ store }).finder.getTags()).toEqual({});
  });
  it('goes into the backup file and comes back, and forget removes it', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    tagBox(a, 0, 'spring');
    a.root.fire('click', { id: 'gl-backup-export' });
    const b = mount({ exports: [] });
    b.root.querySelector('#gl-backup-text').value = files[0]?.text ?? '';
    b.root.fire('click', { id: 'gl-backup-import' });
    expect(b.finder.getTags()).toEqual({ lib: ['spring'] });
    expect(JSON.parse(b.store.getItem(TAGS_STORE_KEY) ?? '{}')).toEqual({ lib: ['spring'] });
    expect(region(b.root, '[data-gl-data]')).toBeDefined();
    b.root.fire('click', { id: 'gl-forget' });
    b.root.fire('click', { id: 'gl-forget-sure' });
    expect(b.finder.getTags()).toEqual({});
    expect(b.store.getItem(TAGS_STORE_KEY)).toBe('{}');
  });
  it('drops tags for places that are not loaded when a backup is loaded', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    tagBox(a, 0, 'spring');
    a.root.fire('click', { id: 'gl-backup-export' });
    const parsed = JSON.parse(files[0]?.text ?? '{}') as { tags: Record<string, string[]> };
    parsed.tags.gone = ['x'];
    const b = mount();
    b.root.querySelector('#gl-backup-text').value = JSON.stringify(parsed);
    b.root.fire('click', { id: 'gl-backup-import' });
    expect(b.finder.getTags()).toEqual({ lib: ['spring'] });
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    tagBox(m, 0, 'printemps');
    expect(spokenText(m.root)).toBe('Étiquette printemps ajoutée à Library.');
    expect(m.root.innerHTML).toContain('Vos étiquettes');
  });
  it('does not change what is reported about a place', () => {
    const m = mount();
    tagBox(m, 0, 'x');
    const before = region(m.root, '[data-gl-pcount]');
    tagBox(m, 0, 'accessible');
    expect(region(m.root, '[data-gl-pcount]')).toBe(before);
  });
});

describe('check again dates', () => {
  const setDate = (m: M, i: number, v: string): void => m.root.fire('change', { id: `gl-due-${i}`, value: v });
  it('has a date box under each place and a panel in the shell', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('id="gl-due-0"');
    expect(m.root.innerHTML).toContain('class="gl-reminders-panel"');
    expect(m.root.innerHTML).toContain('No dates yet.');
  });
  it('sets a date, saves it, lists it and says so', () => {
    const m = mount();
    setDate(m, 3, '2026-11-20');
    expect(m.finder.getReminders()).toEqual({ hall: '2026-11-20' });
    expect(JSON.parse(m.store.getItem(REMINDERS_STORE_KEY) ?? '{}')).toEqual({ hall: '2026-11-20' });
    expect(region(m.root, '[data-gl-reminders]')).toContain('Hall: 2026-11-20. In 5 days.');
    expect(spokenText(m.root)).toBe('Set a date for Hall: 2026-11-20.');
    expect(m.root.querySelector('#gl-due-3').focused).toBe(1);
  });
  it('lists dates earliest first and counts what is due now', () => {
    const m = mount();
    setDate(m, 0, '2026-12-01');
    setDate(m, 1, '2026-11-10');
    setDate(m, 2, '2026-11-15');
    const panel = region(m.root, '[data-gl-reminders]');
    expect(panel.indexOf('Café Nord')).toBeLessThan(panel.indexOf('Pool'));
    expect(panel.indexOf('Pool')).toBeLessThan(panel.indexOf('Library'));
    expect(panel).toContain('2 dates are due now.');
    expect(panel).toContain('Passed 5 days ago');
    expect(panel).toContain('Today');
  });
  it('ignores a date that is not real, and a place that is not there', () => {
    const m = mount();
    setDate(m, 0, '2026-02-30');
    setDate(m, 99, '2026-12-01');
    setDate(m, 0, 'soon');
    expect(m.finder.getReminders()).toEqual({});
  });
  it('clears a date with the button or an empty box', () => {
    const m = mount();
    setDate(m, 0, '2026-12-01');
    m.root.fire('click', { id: 'gl-dueclear-0' });
    expect(m.finder.getReminders()).toEqual({});
    expect(spokenText(m.root)).toBe('Cleared the date for Library.');
    setDate(m, 1, '2026-12-01');
    setDate(m, 1, '');
    expect(m.finder.getReminders()).toEqual({});
  });
  it('shows the place when Show is pressed', () => {
    const m = mount();
    setDate(m, 2, '2026-12-01');
    m.root.fire('click', { id: 'gl-dshow-2' });
    expect(m.root.querySelector('#gl-pq').value).toBe('Pool');
  });
  it('has no calendar button without a host that takes files, and a calendar file with one', () => {
    const none = mount();
    setDate(none, 0, '2026-12-01');
    expect(region(none.root, '[data-gl-reminders]')).not.toContain('gl-due-export');
    none.root.fire('click', { id: 'gl-due-export' });
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    setDate(m, 0, '2026-12-01');
    setDate(m, 1, '2026-11-20');
    expect(region(m.root, '[data-gl-reminders]')).toContain('id="gl-due-export"');
    m.root.fire('click', { id: 'gl-due-export' });
    const f = files[0];
    expect(f?.filename).toBe('check-again-dates-en.ics');
    expect(f?.mime).toBe('text/calendar;charset=utf-8');
    expect(f?.text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(f?.text.indexOf('Café Nord')).toBeLessThan(f?.text.indexOf('Library') ?? 0);
    expect(f?.text).not.toMatch(/accessible|verified/i);
  });
  it('is read back from storage and ignores bad storage', () => {
    const store = new Mem();
    setDate(mount({ store }), 0, '2026-12-01');
    expect(mount({ store }).finder.getReminders()).toEqual({ lib: '2026-12-01' });
    store.setItem(REMINDERS_STORE_KEY, '[1]');
    expect(mount({ store }).finder.getReminders()).toEqual({});
  });
  it('goes into the backup file and comes back, and forget removes it', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    setDate(a, 0, '2026-12-01');
    a.root.fire('click', { id: 'gl-backup-export' });
    const b = mount({ exports: [] });
    b.root.querySelector('#gl-backup-text').value = files[0]?.text ?? '';
    b.root.fire('click', { id: 'gl-backup-import' });
    expect(b.finder.getReminders()).toEqual({ lib: '2026-12-01' });
    b.root.fire('click', { id: 'gl-forget' });
    b.root.fire('click', { id: 'gl-forget-sure' });
    expect(b.finder.getReminders()).toEqual({});
    expect(b.store.getItem(REMINDERS_STORE_KEY)).toBe('{}');
  });
  it('counts both in the data panel', () => {
    const m = mount();
    tagBox(m, 0, 'x');
    setDate(m, 0, '2026-12-01');
    const counts = m.root.innerHTML;
    expect(counts).toContain('data-gl-data');
    const data = region(m.root, '[data-gl-data]');
    expect(data).toContain('1 places with tags');
    expect(data).toContain('1 dates to check again');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    setDate(m, 0, '2026-11-17');
    expect(spokenText(m.root)).toBe('Date choisie pour Library\u00a0: 2026-11-17.');
    expect(region(m.root, '[data-gl-reminders]')).toContain('Dans 2 jours');
  });
});

describe('practise the words', () => {
  const press = (m: M, id: string): void => m.root.fire('click', { id });
  it('shows the first word with the meaning hidden', () => {
    const m = mount();
    const panel = m.root.innerHTML;
    expect(panel).toContain('class="gl-practice-panel"');
    expect(panel).toContain('<strong>Unknown</strong>');
    expect(panel).toContain('id="gl-prac-show"');
    expect(panel).not.toContain('gl-prac-know');
  });
  it('shows the meaning and moves focus to the first mark', () => {
    const m = mount();
    press(m, 'gl-prac-show');
    const panel = region(m.root, '[data-gl-practice]');
    expect(panel).toContain('Meaning:');
    expect(panel).toContain('gl-prac-know');
    expect(m.root.querySelector('#gl-prac-know').focused).toBe(1);
  });
  it('marks a word as known, goes on, saves, and says so', () => {
    const m = mount();
    press(m, 'gl-prac-show');
    press(m, 'gl-prac-know');
    expect(spokenText(m.root)).toBe('Marked Unknown as known.');
    expect(JSON.parse(m.store.getItem(PRACTICE_STORE_KEY) ?? '{}')).toEqual({ unknown: 'known' });
    expect(region(m.root, '[data-gl-practice]')).toContain('Word 2 of ');
    expect(region(m.root, '[data-gl-practice]')).toContain('1 known');
    expect(m.root.querySelector('#gl-prac-show').focused).toBe(1);
  });
  it('marks a word to practise again', () => {
    const m = mount();
    press(m, 'gl-prac-show');
    press(m, 'gl-prac-again');
    expect(spokenText(m.root)).toBe('Marked Unknown to practise again.');
    expect(JSON.parse(m.store.getItem(PRACTICE_STORE_KEY) ?? '{}')).toEqual({ unknown: 'again' });
  });
  it('skips without saving', () => {
    const m = mount();
    press(m, 'gl-prac-skip');
    expect(region(m.root, '[data-gl-practice]')).toContain('Word 2 of ');
    expect(m.store.getItem(PRACTICE_STORE_KEY)).toBeNull();
  });
  it('ignores a mark before the meaning is shown, and ignores other ids', () => {
    const m = mount();
    press(m, 'gl-prac-know');
    press(m, 'gl-prac-x');
    expect(m.root.innerHTML).toContain('Word 1 of ');
    expect(m.store.getItem(PRACTICE_STORE_KEY)).toBeNull();
  });
  it('finishes, then starts another round with the practise-again words first', () => {
    const m = mount();
    press(m, 'gl-prac-show');
    press(m, 'gl-prac-again');
    for (let i = 0; i < 20 && !region(m.root, '[data-gl-practice]').includes('gl-prac-round'); i += 1) {
      press(m, 'gl-prac-show');
      press(m, 'gl-prac-know');
    }
    expect(region(m.root, '[data-gl-practice]')).toContain('You went through every word.');
    press(m, 'gl-prac-round');
    const panel = region(m.root, '[data-gl-practice]');
    expect(panel).toContain('Word 1 of ');
    expect(panel).toContain('<strong>Unknown</strong>');
  });
  it('clears the marks on reset', () => {
    const m = mount();
    press(m, 'gl-prac-show');
    press(m, 'gl-prac-know');
    press(m, 'gl-prac-reset');
    expect(m.store.getItem(PRACTICE_STORE_KEY)).toBe('{}');
    expect(region(m.root, '[data-gl-practice]')).toContain('0 known');
  });
  it('starts the next visit with the marks kept, weak words first', () => {
    const store = new Mem();
    const a = mount({ store });
    press(a, 'gl-prac-show');
    press(a, 'gl-prac-know');
    const b = mount({ store });
    expect(b.root.innerHTML).not.toContain('<strong>Unknown</strong>');
    expect(b.root.innerHTML).toContain('1 known');
  });
  it('ignores bad storage', () => {
    const store = new Mem();
    store.setItem(PRACTICE_STORE_KEY, 'nope');
    expect(mount({ store }).root.innerHTML).toContain('0 known');
  });
  it('is cleared by forget', () => {
    const m = mount();
    press(m, 'gl-prac-show');
    press(m, 'gl-prac-know');
    press(m, 'gl-forget');
    press(m, 'gl-forget-sure');
    expect(m.store.getItem(PRACTICE_STORE_KEY)).toBe('{}');
    expect(region(m.root, '[data-gl-practice]')).toBeDefined();
  });
  it('keeps Unknown as Unknown and says nothing about any place', () => {
    const m = mount();
    press(m, 'gl-prac-show');
    const panel = region(m.root, '[data-gl-practice]');
    expect(panel).toMatch(/not have information/i);
    expect(panel).not.toMatch(/accessible|verified/i);
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    press(m, 'gl-prac-show');
    expect(region(m.root, '[data-gl-practice]')).toContain('Sens\u00a0:');
    press(m, 'gl-prac-know');
    expect(spokenText(m.root)).toBe('Inconnu marqué comme connu.');
  });
});
