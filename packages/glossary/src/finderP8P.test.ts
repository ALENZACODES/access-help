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
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp')] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [yes('elevator'), { termId: 'ramp', status: 'absent', provenance: transit }, { termId: 'grab-bar', status: 'present' }] },
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
  records?: (readonly Place[])[];
  listSource?: Provenance;
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




const spokenText = (root: Root): string => region(root, '[data-gl-announce]');
const press = (m: M, id: string): void => m.root.fire('click', { id });
const HEAD = RECORD_COLUMNS.join(',');

describe('sources for each place', () => {
  it('has a closed sources block under each place card', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('<summary>Sources for Library <span class="gl-note">(1 record)</span></summary>');
    expect(m.root.innerHTML).toContain('<summary>Sources for Café Nord <span class="gl-note">(0 records)</span></summary>');
    expect(m.root.innerHTML).not.toContain('<details class="gl-records" open');
  });
  it('gives source, licence, date and tier for each record, also for features that were not chosen', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('<th scope="row">Ramp</th><td data-status="present">reported as available</td><td>City open data</td><td>CC0-1.0</td><td>2026-10-01</td><td>Tier 1</td>');
    expect(m.root.innerHTML).toContain('<td>Transit agency</td><td>OGL-Canada-2.0</td><td>2025-03-04</td><td>Tier unknown</td>');
  });
  it('shows a record with no source as unknown', () => {
    const m = mount();
    expect(m.root.innerHTML).toContain('<th scope="row">Grab bar</th><td data-status="unknown">unknown</td><td>Unknown</td>');
  });
  it('is still there after the list is redrawn', () => {
    const m = mount();
    m.root.fire('change', { id: 'gl-f-ramp', checked: true });
    expect(region(m.root, '[data-gl-presults]')).toContain('Sources for Library');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr' });
    expect(m.root.innerHTML).toContain('Sources pour Library');
    expect(m.root.innerHTML).toContain('<td>Niveau 1</td>');
  });
});

describe('sources panel', () => {
  it('lists each source with its records, licence, dates and tiers', () => {
    const m = mount();
    const html = m.root.innerHTML;
    expect(html).toContain('class="gl-sources-panel"');
    expect(html).toContain('<p role="status">2 sources</p>');
    expect(html).toContain('<li><strong>City open data</strong><ul><li>2 records, for 2 places.</li><li>Licence: CC0-1.0 (Creative Commons Zero 1.0).</li><li>Dated 2026-10-01.</li><li>Tiers: Tier 1.</li>');
    expect(html).toContain('<li>Tiers: Tier unknown.</li>');
  });
  it('says what the licences ask and explains the tiers', () => {
    const html = mount().root.innerHTML;
    expect(html).toContain('What the licences ask');
    expect(html).toContain('<dd>Say where the data came from.</dd>');
    expect(html).toContain('This is a short summary, not legal advice.');
    expect(html).toContain('Tier 1: a label only.');
  });
  it('marks the source of the place list', () => {
    const list: Provenance = { source: 'Region list', licence: 'CC-BY-4.0', date: '2026-09-09' };
    const html = mount({ listSource: list }).root.innerHTML;
    expect(html).toContain('<p role="status">3 sources</p>');
    expect(html).toContain('The list of places comes from this source.');
  });
  it('saves the credits as text only with a host that takes files', () => {
    const none = mount();
    expect(none.root.innerHTML).not.toContain('gl-credits-export');
    press(none, 'gl-credits-export');
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    expect(m.root.innerHTML).toContain('id="gl-credits-export"');
    press(m, 'gl-credits-export');
    expect(files[0]?.filename).toBe('data-credits-en.txt');
    expect(files[0]?.text).toContain('Made on 2026-11-15.');
    expect(files[0]?.text).toContain('Contains information from City open data, dated 2026-10-01. Licence: CC0-1.0 (Creative Commons Zero 1.0).');
    expect(files[0]?.text).toContain('Contains information from Transit agency, dated 2025-03-04.');
    expect(files[0]?.text).toContain('- Say where the data came from.');
  });
  it('is French in French', () => {
    const files: ExportFile[] = [];
    const m = mount({ lang: 'fr', exports: files });
    expect(m.root.innerHTML).toContain('D’où vient cette information');
    press(m, 'gl-credits-export');
    expect(files[0]?.filename).toBe('data-credits-fr.txt');
    expect(files[0]?.text).toContain('Mentions pour l’information');
  });
});

describe('records as a table', () => {
  const paste = (m: M, csv: string): void => {
    m.root.querySelector('#gl-records-text').value = csv;
    press(m, 'gl-records-load');
  };
  it('has nothing when the host takes neither files nor records', () => {
    const html = mount().root.innerHTML;
    expect(html).not.toContain('gl-records-export');
    expect(html).not.toContain('gl-records-text');
    expect(html).not.toContain('Carry records between devices');
  });
  it('saves every record with its own source, licence, date and tier', () => {
    const files: ExportFile[] = [];
    const m = mount({ exports: files });
    press(m, 'gl-records-export');
    const f = files[0];
    expect(f?.filename).toBe('records-en.csv');
    expect(f?.mime).toBe('text/csv;charset=utf-8');
    expect(f?.text.startsWith(`${HEAD}\r\n`)).toBe(true);
    expect(f?.text).toContain('lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\r\n');
    expect(f?.text).toContain('hall,Hall,ramp,absent,Transit agency,OGL-Canada-2.0,2025-03-04,,\r\n');
    expect(f?.text).toContain('cafe,Café Nord,,,,,,,\r\n');
  });
  it('has the box only with a host that takes records', () => {
    expect(mount({ exports: [] }).root.innerHTML).not.toContain('gl-records-text');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('<label for="gl-records-text">Paste a table of records</label>');
    expect(html).toContain('id="gl-records-load"');
  });
  it('loads a table, shows the places at once, gives them to the host and says so', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    paste(m, `${HEAD}\nnew,New Place,ramp,present,Town list,CC-BY-4.0,2026-11-01,Tier 0,\nnew,New Place,elevator,absent,Town list,CC-BY-4.0,2026-11-01,,\n`);
    expect(got).toHaveLength(1);
    expect(got[0]?.map((p) => p.name)).toEqual(['New Place']);
    expect(m.root.innerHTML).toContain('Sources for New Place');
    expect(m.root.innerHTML).not.toContain('Sources for Library');
    expect(m.root.innerHTML).toContain('<td>Town list</td><td>CC-BY-4.0</td><td>2026-11-01</td><td>Tier 0</td>');
    expect(m.root.innerHTML).toContain('Loaded 2 records for 1 places.');
    expect(spokenText(m.root)).toBe('Loaded 2 records for 1 places.');
    expect(m.root.querySelector('#gl-records-text').focused).toBe(1);
  });
  it('reads back a table it saved, with nothing lost', () => {
    const files: ExportFile[] = [];
    const a = mount({ exports: files });
    press(a, 'gl-records-export');
    const got: (readonly Place[])[] = [];
    const b = mount({ records: got });
    paste(b, files[0]?.text ?? '');
    expect(got[0]).toEqual(places);
  });
  it('changes nothing when the table cannot be read, and says why', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    paste(m, 'place_id,feature\na,ramp\n');
    expect(got).toEqual([]);
    expect(m.root.innerHTML).toContain('Sources for Library');
    expect(region(m.root, '[data-gl-records-msg]')).toBe('The table could not be read. Nothing was changed. A column is missing.');
    expect(spokenText(m.root)).toBe('The table could not be read. Nothing was changed. A column is missing.');
  });
  it('changes nothing for an empty box or a table with no usable rows', () => {
    const got: (readonly Place[])[] = [];
    const m = mount({ records: got });
    paste(m, '');
    paste(m, `${HEAD}\nx,X,teleporter,present,,,,,\n`);
    expect(got).toEqual([]);
    expect(region(m.root, '[data-gl-records-msg]')).toBe('Loaded 0 records for 0 places. 1 row was left out.');
  });
  it('escapes the message', () => {
    const m = mount({ records: [] });
    paste(m, 'a\n');
    expect(region(m.root, '[data-gl-records-msg]')).not.toContain('<');
  });
  it('says how many rows were left out and how many records cannot be used', () => {
    const m = mount({ records: [] });
    paste(m, `${HEAD}\na,A,ramp,present,,,,,\na,A,teleporter,present,,,,,\n`);
    expect(spokenText(m.root)).toBe('Loaded 1 records for 1 places. 1 row was left out. 1 record has no usable source. It is shown as Unknown.');
    expect(m.root.innerHTML).toContain('<th scope="row">Ramp</th><td data-status="unknown">unknown</td>');
  });
  it('keeps saved places that are still there and drops the rest', () => {
    const m = mount({ records: [] });
    press(m, 'gl-save-0');
    press(m, 'gl-save-1');
    paste(m, `${HEAD}\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\n`);
    expect(m.finder.getSaved()).toEqual(['lib']);
  });
  it('clears the message when the host sets places itself', () => {
    const m = mount({ records: [] });
    paste(m, `${HEAD}\na,A,ramp,present,,,,,\n`);
    m.finder.setPlaces(places);
    expect(m.root.innerHTML).not.toContain('Loaded 1 records');
  });
  it('does nothing without a host that takes records', () => {
    const m = mount();
    paste(m, `${HEAD}\na,A,ramp,present,,,,,\n`);
    expect(m.root.innerHTML).toContain('Sources for Library');
  });
  it('is French in French', () => {
    const m = mount({ lang: 'fr', records: [] });
    paste(m, '');
    expect(spokenText(m.root)).toBe('Le tableau n’a pas pu être lu. Rien n’a été changé. Le tableau est vide.');
    expect(m.root.innerHTML).toContain('Transporter les fiches entre appareils');
  });
});
