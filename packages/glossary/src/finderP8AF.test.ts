import { describe, expect, it } from 'vitest';
import {
  RECORD_COLUMNS,
  buildDataset,
  mountPlaceFinder,
  type ExportFile,
  type FeatureClaim,
  type FinderElement,
  type FinderRoot,
  type IndexStore,
  type Lang,
  type Place,
  type Provenance,
  removePlaceId,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')], info: { kind: 'library', area: 'Riverside', provenance: prov } },
  { id: 'cafe', name: 'Café Nord', claims: [], info: { kind: 'cafe', area: 'riverside', provenance: transit } },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [yes('elevator'), { termId: 'ramp', status: 'absent', provenance: transit }, { termId: 'grab-bar', status: 'present' }, yes('ramp')], info: { area: 'Old Town' } },
];
const bare: Place[] = places.map(({ info: _info, ...rest }) => rest);
const today = '2026-11-15';
const HEAD = RECORD_COLUMNS.join(',');

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
  records?: (readonly Place[])[];
  listSource?: Provenance;
  store?: Mem;
  exports?: ExportFile[];
  places?: readonly Place[];
}
const mount = (o: Opts = {}) => {
  const root = new Root();
  const store = o.store ?? new Mem();
  const finder = mountPlaceFinder(root, {
    lang: o.lang ?? 'en',
    places: o.places ?? places,
    today,
    store,
    ...(o.exports === undefined ? {} : { onExport: (f: ExportFile) => o.exports?.push(f) }),
    ...(o.records === undefined ? {} : { onRecords: (p: readonly Place[]) => o.records?.push(p) }),
    ...(o.listSource === undefined ? {} : { dataset: buildDataset(places.slice(0, 3), o.listSource, today).dataset }),
  });
  return { root, finder, store };
};
type M = ReturnType<typeof mount>;
const region = (root: Root, selector: string): string => root.querySelector(selector).innerHTML;
const spoken = (root: Root): string => region(root, '[data-gl-announce]');
const save = (m: M, ...indexes: number[]): void => {
  for (const i of indexes) m.root.fire('click', { id: `gl-save-${i}` });
};
const press = (m: M, id: string): void => m.root.fire('click', { id });
const change = (m: M, id: string, value: string): void => m.root.fire('change', { id, value });
const results = (m: M): string => region(m.root, '[data-gl-presults]');
const seenList = (m: M): string => region(m.root, '[data-gl-seen-list]');
const seenForm = (m: M): string => region(m.root, '[data-gl-seen-form]');
const seenShare = (m: M): string => region(m.root, '[data-gl-seen-share]');
const KEY = 'glossary-seen';
const fill = (m: M, values: Record<string, string>): void => {
  for (const [field, value] of Object.entries(values)) m.root.querySelector(`#gl-seen-${field}`).value = value;
};
const RAMP = { place: '0', feature: 'ramp', what: 'there', date: '2026-11-14', note: '' };
const saw = (m: M, values: Partial<typeof RAMP> = {}): void => {
  fill(m, { ...RAMP, ...values });
  press(m, 'gl-seen-save');
};
const stored = (m: M): unknown => JSON.parse(m.store.getItem(KEY) ?? '[]');

describe('the panel for what a person saw', () => {
  it('is part of the page, says what the notes are, and starts empty', () => {
    const html = mount({ exports: [] }).root.innerHTML;
    expect(html).toContain(
      '<details class="gl-seen-panel"><summary>What you saw</summary><p>Keep your own notes of what you saw at a place. They stay on this device. They are not records and do not change the list.</p><div data-gl-seen-form><h4>Add what you saw</h4>',
    );
    expect(html).toContain('<div data-gl-seen-list><p role="status">You have not added anything you saw.</p></div><div data-gl-seen-share></div>');
    expect(html).not.toContain('class="gl-seen"');
  });
  it('offers the loaded places and starts on today', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('<select id="gl-seen-place" class="gl-select"><option value="" selected>Choose a place</option><option value="0">Library</option><option value="1">Café Nord</option>');
    expect(html).toContain('id="gl-seen-date" class="gl-input" maxlength="10" autocomplete="off" value="2026-11-15">');
  });
});

describe('saving what a person saw', () => {
  it('keeps the note on the device, lists it, shows it under the place and says so', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    saw(m, { note: ' by the  side door ' });
    expect(stored(m)).toEqual([{ placeId: 'lib', termId: 'ramp', seen: 'there', date: '2026-11-14', note: 'by the side door' }]);
    expect(m.finder.getSeen()).toHaveLength(1);
    expect(seenList(m)).toContain('<p role="status">You have 1 note of what you saw.</p>');
    expect(seenList(m)).toContain('<strong>Library</strong> <span>Ramp: it was there. Seen on 2026-11-14. Your words: “by the side door”. The records say the same.</span>');
    expect(results(m)).toContain('<div class="gl-seen"><p class="gl-note">Your own notes, which are not records:</p><ul><li data-seen="there">Ramp: it was there. Seen on 2026-11-14.</li></ul></div>');
    expect(spoken(m.root)).toBe('Saved what you saw at Library: Ramp.');
    expect(seenForm(m)).toContain('<p role="status" data-gl-seen-msg>Saved what you saw at Library: Ramp.</p>');
    expect(m.root.querySelector('#gl-seen-feature').focused).toBe(1);
    expect(records).toHaveLength(0);
  });
  it('keeps the place and the day for the next note, and clears the rest', () => {
    const m = mount();
    saw(m, { note: 'x' });
    const form = seenForm(m);
    expect(form).toContain('<option value="0" selected>Library</option>');
    expect(form).toContain('value="2026-11-14">');
    expect(form).toContain('<option value="" selected>Choose a feature</option>');
    expect(form).toContain('<option value="" selected>Choose one</option>');
    expect(form).toContain('id="gl-seen-note" class="gl-input" maxlength="280" autocomplete="off" value="">');
  });
  it('never changes what the list reports about the place', () => {
    const m = mount();
    const before = m.root.innerHTML;
    const card = (html: string): string => html.slice(html.indexOf('<h3 id="place-0-lib">'), html.indexOf('<h3 id="place-1-'));
    saw(m, { what: 'not-there' });
    const after = results(m);
    expect(after).toContain('Ramp: it was not there. Seen on 2026-11-14.');
    const strip = (html: string): string => html.replace(/<div class="gl-seen">.*?<\/div>/, '');
    expect(strip(after.slice(after.indexOf('<h3 id="place-0-lib">'), after.indexOf('<h3 id="place-1-')))).toBe(card(before));
    expect(seenList(m)).toContain('The records say something else.');
  });
  it('keeps unknown as unknown when the records say nothing', () => {
    const m = mount();
    saw(m, { place: '2', feature: 'elevator' });
    expect(seenList(m)).toContain('<li data-against="records-unknown" data-seen="there"><strong>Pool</strong> <span>Elevator: it was there. Seen on 2026-11-14. The records show this feature as Unknown.</span>');
    expect(results(m)).not.toMatch(/Elevator: (Available|Reported)/);
  });
  it('says so when the sources in the records disagree', () => {
    const m = mount();
    saw(m, { place: '3' });
    expect(seenList(m)).toContain('The sources in the records disagree about this feature.');
  });
  it('replaces the note for the same place and feature', () => {
    const m = mount();
    saw(m);
    saw(m, { what: 'not-sure', date: '2026-11-15' });
    expect(stored(m)).toEqual([{ placeId: 'lib', termId: 'ramp', seen: 'not-sure', date: '2026-11-15' }]);
    expect(spoken(m.root)).toBe('Changed what you saw at Library: Ramp.');
    expect(seenList(m)).toContain('<li data-against="not-compared" data-seen="not-sure"><strong>Library</strong> <span>Ramp: you could not tell. Seen on 2026-11-15.</span>');
  });
  it('says so when the note is already held', () => {
    const m = mount();
    saw(m);
    saw(m);
    expect(spoken(m.root)).toBe('You already have this note.');
    expect(m.finder.getSeen()).toHaveLength(1);
  });
  it('saves nothing with a problem, lists what to fix and puts the focus on the first box to fix', () => {
    const m = mount();
    saw(m, { feature: '', date: '2026-11-16', note: 'kept' });
    const form = seenForm(m);
    expect(form).toContain('<div id="gl-seen-errors" role="alert"><p>There are 2 things to fix before this can be saved.</p><ul><li>Choose a feature.</li><li>The date cannot be after today.</li></ul></div>');
    expect(form).toContain('value="kept"');
    expect(form).toContain('<option value="0" selected>Library</option>');
    expect(spoken(m.root)).toBe('There are 2 things to fix before this can be saved.');
    expect(m.root.querySelector('#gl-seen-feature').focused).toBe(1);
    expect(m.store.getItem(KEY)).toBeNull();
    saw(m, { what: '', note: '' });
    expect(m.root.querySelector('#gl-seen-what').focused).toBe(1);
  });
  it('asks for a place when none is chosen', () => {
    const m = mount();
    saw(m, { place: '' });
    expect(seenForm(m)).toContain('<p role="status" data-gl-seen-msg>Choose a place first.</p>');
    expect(spoken(m.root)).toBe('Choose a place first.');
    expect(m.root.querySelector('#gl-seen-place').focused).toBe(1);
    saw(m, { place: '77' });
    saw(m, { place: 'x' });
    expect(m.finder.getSeen()).toEqual([]);
  });
  it('works for a host that keeps no records, because the notes are the person’s own', () => {
    const m = mount();
    expect(m.root.innerHTML).not.toContain('data-gl-pi');
    saw(m);
    expect(m.finder.getSeen()).toHaveLength(1);
  });
  it('is in French', () => {
    const m = mount({ lang: 'fr' });
    saw(m);
    expect(spoken(m.root)).toBe('Note enregistrée pour Library\u00a0: Rampe.');
    expect(results(m)).toContain('Vos propres notes, qui ne sont pas des fiches\u00a0:');
    expect(seenList(m)).toContain('Rampe\u00a0: c’était là. Vu le 2026-11-14. Les fiches disent la même chose.');
    saw(m, { place: '2', feature: 'elevator' });
    expect(seenList(m)).toContain('Les fiches indiquent UNKNOWN pour cette caractéristique.');
  });
});

describe('removing what a person saw', () => {
  it('removes the note, says so and offers Undo', () => {
    const m = mount();
    saw(m);
    saw(m, { feature: 'elevator' });
    press(m, 'gl-seen-rm-0');
    const html = m.root.innerHTML;
    expect(stored(m)).toEqual([{ placeId: 'lib', termId: 'elevator', seen: 'there', date: '2026-11-14' }]);
    expect(html).toContain('You have 1 note of what you saw.');
    expect(html).toContain('id="gl-undo">Undo: remove what you saw</button>');
    expect(html).not.toContain('Ramp: it was there. Seen on');
    expect(spoken(m.root)).toBe('Removed what you saw at Library: Ramp.');
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
  });
  it('puts the note back where it was when the step is undone', () => {
    const m = mount();
    saw(m);
    saw(m, { feature: 'elevator' });
    const before = stored(m);
    press(m, 'gl-seen-rm-0');
    press(m, 'gl-undo');
    expect(stored(m)).toEqual(before);
    expect(seenList(m)).toContain('You have 2 notes of what you saw.');
  });
  it('ignores a button for a note that is not there', () => {
    const m = mount();
    saw(m);
    press(m, 'gl-seen-rm-5');
    expect(m.finder.getSeen()).toHaveLength(1);
    expect(m.root.innerHTML).not.toContain('id="gl-undo"');
  });
});

describe('the list of notes beside the records', () => {
  const three = (m: M): void => {
    saw(m);
    saw(m, { feature: 'elevator', what: 'not-there', place: '3' });
    saw(m, { place: '1', feature: 'elevator' });
  };
  it('sums how the notes stand against the records', () => {
    const m = mount();
    three(m);
    expect(seenList(m)).toContain(
      '<ul class="gl-seen-counts"><li data-against="same">The records say the same: 1</li><li data-against="different">The records say something else: 1</li><li data-against="records-unknown">The records show Unknown: 1</li></ul>',
    );
  });
  it('narrows to the notes the records answer differently, redrawing only the list', () => {
    const m = mount();
    three(m);
    const form = seenForm(m);
    change(m, 'gl-seen-filter', 'different');
    expect(seenList(m)).toContain('<option value="different" selected>');
    expect(seenList(m).match(/<li data-against="[a-z-]+" data-seen=/g)).toHaveLength(1);
    expect(seenList(m)).toContain('<strong>Hall</strong>');
    expect(seenList(m)).not.toContain('<strong>Library</strong>');
    expect(seenForm(m)).toBe(form);
    expect(m.root.querySelector('#gl-seen-filter').focused).toBe(1);
    change(m, 'gl-seen-filter', 'records-unknown');
    expect(seenList(m)).toContain('<strong>Café Nord</strong>');
    change(m, 'gl-seen-filter', 'nonsense');
    expect(seenList(m)).toContain('<option value="records-unknown" selected>');
    change(m, 'gl-seen-filter', 'all');
    expect(seenList(m).match(/<li data-against="[a-z-]+" data-seen=/g)).toHaveLength(3);
  });
  it('follows the records: a note stands differently once a source is left out', () => {
    const m = mount();
    saw(m);
    expect(seenList(m)).toContain('The records say the same.');
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).toContain('<span>Ramp: it was there. Seen on 2026-11-14. The records show this feature as Unknown.</span>');
  });
  it('follows the places: a note stays stored when its place is removed, and is counted apart', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    saw(m);
    saw(m, { place: '1' });
    press(m, removePlaceId(0));
    expect(m.finder.getSeen()).toHaveLength(2);
    expect(m.root.innerHTML).toContain('<p role="status">You have 1 note of what you saw.</p><p class="gl-note" data-gl-seen-more>1 more note is for a place that is not loaded now.</p>');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).toContain('You have 2 notes of what you saw.');
  });
});

describe('taking the notes away from the device', () => {
  it('has nothing to save for a host that cannot save files', () => {
    const m = mount();
    saw(m);
    expect(seenList(m)).not.toContain('gl-seen-export');
    expect(seenShare(m)).toBe('');
    press(m, 'gl-seen-export');
    press(m, 'gl-seen-share');
    expect(spoken(m.root)).toBe('Saved what you saw at Library: Ramp.');
  });
  it('saves the notes as text', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    saw(m);
    press(m, 'gl-seen-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('what-you-saw-en.txt');
    expect(exports[0]?.text).toBe('What you saw (1)\nMade on 2026-11-15. These are a person’s own notes, not records.\n\nLibrary\n- Ramp: it was there. Seen on 2026-11-14. The records say the same.\n');
  });
  it('wants a name and an open licence before it shares the notes as records', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    saw(m);
    expect(seenShare(m)).toContain('<h4>Share what you saw as a table of records</h4>');
    press(m, 'gl-seen-share');
    expect(exports).toHaveLength(0);
    expect(seenShare(m)).toContain('<div id="gl-seen-share-errors" role="alert"><ul><li>Give a name for the source.</li><li>Choose an open licence from the list.</li></ul></div>');
    expect(spoken(m.root)).toBe('Give a name for the source.');
    expect(m.root.querySelector('#gl-seen-name').focused).toBe(1);
    fill(m, { name: 'Sam Lee', licence: 'Proprietary' });
    press(m, 'gl-seen-share');
    expect(exports).toHaveLength(0);
    expect(seenShare(m)).toContain('value="Sam Lee"');
    expect(m.root.querySelector('#gl-seen-licence').focused).toBe(1);
  });
  it('saves a table of records that names the person as the source', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    saw(m);
    saw(m, { place: '2', feature: 'elevator', what: 'not-there' });
    saw(m, { place: '1', what: 'not-sure' });
    fill(m, { name: ' Sam  Lee ', licence: 'CC0-1.0' });
    press(m, 'gl-seen-share');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('what-you-saw-records.csv');
    expect(exports[0]?.text).toBe(`${HEAD}\r\nlib,Library,ramp,present,Sam Lee,CC0-1.0,2026-11-14,,\r\npool,Pool,elevator,absent,Sam Lee,CC0-1.0,2026-11-14,,\r\n`);
    expect(seenShare(m)).toContain('<p role="status" data-gl-seen-share-msg>Saved a table with 2 records.</p>');
    expect(spoken(m.root)).toBe('Saved a table with 2 records.');
    expect(m.root.querySelector('#gl-seen-share').focused).toBe(1);
  });
  it('says there is nothing to share when the person could not tell each time', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    saw(m, { what: 'not-sure' });
    fill(m, { name: 'Sam Lee', licence: 'CC0-1.0' });
    press(m, 'gl-seen-share');
    expect(exports).toHaveLength(0);
    expect(spoken(m.root)).toBe('There is nothing to share. Notes where you could not tell are left out.');
  });
  it('clears the message about the table when the notes change', () => {
    const exports: ExportFile[] = [];
    const m = mount({ exports });
    saw(m);
    fill(m, { name: 'Sam Lee', licence: 'CC0-1.0' });
    press(m, 'gl-seen-share');
    saw(m, { feature: 'elevator' });
    expect(seenShare(m)).toContain('<p role="status" data-gl-seen-share-msg></p>');
    expect(seenShare(m)).toContain('<option value="CC0-1.0" selected>');
  });
});

describe('the notes with the rest of the person’s data', () => {
  it('are read from the device when the page opens, and bad lines are left out', () => {
    const store = new Mem();
    store.setItem(KEY, JSON.stringify([{ placeId: 'lib', termId: 'ramp', seen: 'there', date: '2026-11-01' }, { placeId: 'lib', termId: 'moat', seen: 'there', date: '2026-11-01' }, { placeId: 'gone', termId: 'ramp', seen: 'there', date: '2026-11-01' }]));
    const m = mount({ store });
    expect(m.finder.getSeen()).toHaveLength(2);
    expect(m.root.innerHTML).toContain('You have 1 note of what you saw.');
    expect(m.root.innerHTML).toContain('1 more note is for a place that is not loaded now.');
    expect(m.root.innerHTML).toContain('<li data-seen="there">Ramp: it was there. Seen on 2026-11-01.</li>');
  });
  it('start empty when what is stored cannot be read', () => {
    const store = new Mem();
    store.setItem(KEY, '{broken');
    expect(mount({ store }).finder.getSeen()).toEqual([]);
  });
  it('go into the copy of the data and come back on another device', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    saw(a, { note: 'side door' });
    expect(region(a.root, '[data-gl-data]')).toContain('1 notes of what you saw');
    press(a, 'gl-backup-export');
    expect(JSON.parse(files[0]?.text ?? '{}').seen).toEqual([{ placeId: 'lib', termId: 'ramp', seen: 'there', date: '2026-11-14', note: 'side door' }]);
    const b = mount();
    b.root.querySelector('#gl-backup-text').value = files[0]?.text ?? '';
    press(b, 'gl-backup-import');
    expect(b.finder.getSeen()).toEqual(a.finder.getSeen());
    expect(stored(b)).toEqual(stored(a));
    expect(b.root.innerHTML).toContain('Ramp: it was there. Seen on 2026-11-14.');
  });
  it('are removed by forget everything', () => {
    const m = mount();
    saw(m);
    press(m, 'gl-forget');
    expect(region(m.root, '[data-gl-data]')).toContain('It also removes what you saw.');
    press(m, 'gl-forget-sure');
    expect(m.finder.getSeen()).toEqual([]);
    expect(stored(m)).toEqual([]);
    expect(m.root.innerHTML).toContain('You have not added anything you saw.');
    expect(m.root.innerHTML).not.toContain('class="gl-seen"');
  });
});
