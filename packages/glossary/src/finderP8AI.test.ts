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
const form = (m: M): string => region(m.root, '[data-gl-pc]');
const walk = (m: M): string => region(m.root, '[data-gl-steps-walk]');
const fill = (m: M, values: Record<string, string>): void => {
  for (const [field, value] of Object.entries(values)) m.root.querySelector(`#gl-pc-${field}`).value = value;
};
const GOOD = { address: '1 Main Street', phone: '416 555 0100', website: 'https://pool.example.org', email: 'info@pool.example.org', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const reach = { address: '9 Mill Road', phone: '(416) 555-0199', provenance: prov };
const withReach: Place[] = places.map((p, i) => (i === 0 ? { ...p, contact: reach } : i === 3 ? { ...p, contact: { phone: '416 555 0100' } } : p));

describe('how to reach a place, under its name', () => {
  it('lists the details that can be shown, as text, with their source', () => {
    const html = mount({ places: withReach }).root.innerHTML;
    expect(html).toContain(
      '<ul class="gl-contact" aria-label="How to reach Library"><li data-contact="address">Address: <span class="gl-contact-value">9 Mill Road</span></li><li data-contact="phone">Phone: <span class="gl-contact-value">(416) 555-0199</span></li></ul>' +
        '<p class="gl-note gl-contact-source">Source: City open data, dated 2026-10-01.</p>',
    );
    expect(html.match(/<ul class="gl-contact"/g)).toHaveLength(1);
  });
  it('says so when details are held without a usable source, and does not show them', () => {
    const html = mount({ places: withReach }).root.innerHTML;
    expect(html).toContain('<p class="gl-note gl-contact-note">Contact details are held for this place, but they cannot be shown.');
    expect(html).not.toContain('416 555 0100');
    expect(html).not.toContain('href="tel:');
    expect(html).not.toContain('href="mailto:');
  });
  it('shows nothing for places that hold no contact details', () => {
    const html = mount().root.innerHTML;
    expect(html).not.toContain('<ul class="gl-contact"');
    expect(html).not.toContain('gl-contact-note');
  });
  it('is in French', () => {
    const html = mount({ places: withReach, lang: 'fr' }).root.innerHTML;
    expect(html).toContain('aria-label="Comment joindre Library"');
    expect(html).toContain('Téléphone\u00a0: <span class="gl-contact-value">(416) 555-0199</span>');
  });
  it('follows the choices about which records count: a source left out takes its contact details with it', () => {
    const m = mount({ places: withReach });
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).not.toContain('<ul class="gl-contact"');
  });
});

describe('how to reach a place, in the steps of a visit', () => {
  it('comes after the steps of the chosen place', () => {
    const m = mount({ places: withReach });
    change(m, 'gl-steps-place', '0');
    expect(walk(m)).toContain('<h5>How to reach this place</h5><ul class="gl-contact" aria-label="How to reach Library">');
    expect(walk(m).indexOf('<ol class="gl-steps">')).toBeLessThan(walk(m).indexOf('How to reach this place'));
  });
  it('says the contact details are unknown for a place that holds none', () => {
    const m = mount({ places: withReach });
    change(m, 'gl-steps-place', '1');
    expect(walk(m)).toContain('<h5>How to reach this place</h5><p class="gl-note" data-gl-reach-unknown>Contact details for this place are Unknown.</p>');
    change(m, 'gl-steps-place', '');
    expect(walk(m)).not.toContain('How to reach this place');
  });
  it('uses the token in French', () => {
    const m = mount({ places: withReach, lang: 'fr' });
    change(m, 'gl-steps-place', '1');
    expect(walk(m)).toContain('Les coordonnées de ce lieu sont UNKNOWN.');
  });
});

describe('the sheet of questions and the table of contact details', () => {
  it('saves a sheet for the chosen place: how to reach it and the questions the records leave open', () => {
    const exports: ExportFile[] = [];
    const m = mount({ places: withReach, exports });
    press(m, 'gl-reach-sheet');
    expect(exports).toHaveLength(0);
    change(m, 'gl-steps-place', '0');
    expect(walk(m)).toContain('id="gl-reach-sheet">Save a sheet of questions for this place</button>');
    press(m, 'gl-reach-sheet');
    expect(exports[0]?.filename).toBe('questions-for-a-place-en.txt');
    const text = exports[0]?.text ?? '';
    expect(text.startsWith('Questions to ask Library\nMade on 2026-11-15 from the loaded records.\n\nHow to reach this place\n- Address: 9 Mill Road\n- Phone: (416) 555-0199\n- Website: Unknown\n- Email: Unknown\n- Source: City open data, dated 2026-10-01.\n')).toBe(true);
    expect(text.match(/^ {3}Answer:$/gm)).toHaveLength(7);
    expect(text).not.toContain('Is there a ramp?');
  });
  it('has no button to save the sheet for a host that cannot save files', () => {
    const m = mount({ places: withReach });
    change(m, 'gl-steps-place', '0');
    expect(walk(m)).not.toContain('gl-reach-sheet');
  });
  it('counts the contact details that can be shown, and follows the records', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records, places: withReach });
    expect(m.root.innerHTML).toContain('<tr data-contact="phone"><th scope="row">Phone</th><td>1</td><td>3</td></tr>');
    expect(mount().root.innerHTML).toContain('<div data-gl-contact-cover><p class="gl-note" data-gl-contact-none>No place has contact details yet.</p></div>');
    change(m, 'gl-pc-place', '0');
    press(m, 'gl-pc-remove');
    expect(m.root.innerHTML).toContain('<tr data-contact="phone"><th scope="row">Phone</th><td>0</td><td>4</td></tr>');
  });
});

describe('setting how to reach a place', () => {
  it('has the form only when the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('<div data-gl-pc>');
    expect(mount({ records: [] }).root.innerHTML).toContain('<div data-gl-pc><h4>Set how to reach a place</h4>');
  });
  it('fills the form with what the chosen place holds, redrawing only the form', () => {
    const m = mount({ records: [], places: withReach });
    const before = m.root.innerHTML;
    change(m, 'gl-pc-place', '0');
    expect(m.root.innerHTML).toBe(before);
    expect(form(m)).toContain('<option value="0" selected>Library</option>');
    expect(form(m)).toContain('value="9 Mill Road"');
    expect(form(m)).toContain('value="(416) 555-0199"');
    expect(form(m)).toContain('id="gl-pc-remove"');
    expect(m.root.querySelector('#gl-pc-place').focused).toBe(1);
    change(m, 'gl-pc-place', '44');
    expect(form(m)).toContain('<option value="" selected>Choose a place</option>');
  });
  it('saves the details with their source, tells the host, shows them and offers Undo', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pc-place', '2');
    fill(m, GOOD);
    press(m, 'gl-pc-save');
    expect(records).toHaveLength(1);
    expect(records[0]?.[2]?.contact).toEqual({ address: '1 Main Street', phone: '416 555 0100', website: 'https://pool.example.org', email: 'info@pool.example.org', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' } });
    const html = m.root.innerHTML;
    expect(html).toContain('<ul class="gl-contact" aria-label="How to reach Pool">');
    expect(html).toContain('<li data-contact="website">Website: <span class="gl-contact-value">https://pool.example.org</span></li>');
    expect(html).not.toContain('href="https://pool.example.org"');
    expect(html).toContain('<p role="status" data-gl-pc-msg>Saved how to reach Pool.</p>');
    expect(html).toContain('id="gl-undo">Undo: contact details</button>');
    expect(html).toContain('Set how to reach Pool.');
    expect(spoken(m.root)).toBe('Saved how to reach Pool.');
    expect(m.root.querySelector('#gl-undo').focused).toBe(1);
  });
  it('takes the details away again when the step is undone', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pc-place', '2');
    fill(m, GOOD);
    press(m, 'gl-pc-save');
    press(m, 'gl-undo');
    expect('contact' in (records[records.length - 1]?.[2] as Place)).toBe(false);
    expect(m.root.innerHTML).not.toContain('<ul class="gl-contact"');
  });
  it('saves nothing that is not well formed, lists what to fix and puts the focus on the first box to fix', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pc-place', '2');
    fill(m, { ...GOOD, phone: '555', website: 'pool.example.org', licence: '' });
    press(m, 'gl-pc-save');
    expect(form(m)).toContain('<div id="gl-pc-errors" role="alert"><p>There are 3 things to fix before this can be saved.</p>');
    expect(form(m)).toContain('<li>Give the website as a full address that starts with https.</li>');
    expect(form(m)).toContain('value="pool.example.org"');
    expect(form(m)).toContain('<option value="2" selected>Pool</option>');
    expect(spoken(m.root)).toBe('There are 3 things to fix before this can be saved.');
    expect(m.root.querySelector('#gl-pc-phone').focused).toBe(1);
    expect(records).toHaveLength(0);
    expect(m.root.innerHTML).not.toContain('id="gl-undo"');
  });
  it('asks for a place when none is chosen, and says so when nothing changes', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records, places: withReach });
    fill(m, GOOD);
    press(m, 'gl-pc-save');
    expect(form(m)).toContain('<p role="status" data-gl-pc-msg>Choose a place to reach first.</p>');
    expect(m.root.querySelector('#gl-pc-place').focused).toBe(1);
    change(m, 'gl-pc-place', '0');
    fill(m, { address: '9 Mill Road', phone: '(416) 555-0199', website: '', email: '', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' });
    press(m, 'gl-pc-save');
    expect(form(m)).toContain('The place already has these contact details.');
    expect(records).toHaveLength(0);
  });
  it('removes the details of a place, and Undo brings them back', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records, places: withReach });
    change(m, 'gl-pc-place', '0');
    press(m, 'gl-pc-remove');
    expect('contact' in (records[0]?.[0] as Place)).toBe(false);
    expect(records[0]?.[0]?.info).toEqual(places[0]?.info);
    expect(m.root.innerHTML).toContain('Removed the contact details of Library.');
    press(m, 'gl-undo');
    expect(records[records.length - 1]?.[0]?.contact).toEqual(reach);
  });
  it('keeps the details in the table of records, so they survive a reload', () => {
    const exports: ExportFile[] = [];
    const m = mount({ records: [], exports, places: withReach });
    press(m, 'gl-records-export');
    const lines = (exports[0]?.text ?? '').split('\r\n');
    expect(lines[0]).toBe([...RECORD_COLUMNS, 'place_kind', 'place_area', 'place_address', 'place_phone', 'place_website', 'place_email'].join(','));
    expect(lines[1]).toBe('lib,Library,,,City open data,CC0-1.0,2026-10-01,tier-1,,library,Riverside,9 Mill Road,(416) 555-0199,,');
  });
  it('does nothing while a source is left out of the count, and for a host that keeps no records', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    change(m, 'gl-pc-place', '2');
    m.root.fire('change', { id: 'gl-rv-src-1', checked: false });
    expect(m.root.innerHTML).not.toContain('<div data-gl-pc>');
    fill(m, GOOD);
    press(m, 'gl-pc-save');
    press(m, 'gl-pc-remove');
    expect(records).toHaveLength(0);
    const plain = mount();
    press(plain, 'gl-pc-save');
    expect(spoken(plain.root)).toBe('');
  });
  it('is in French', () => {
    const m = mount({ records: [], lang: 'fr' });
    change(m, 'gl-pc-place', '2');
    fill(m, GOOD);
    press(m, 'gl-pc-save');
    expect(spoken(m.root)).toBe('Coordonnées enregistrées pour Pool.');
    expect(m.root.innerHTML).toContain('id="gl-undo">Annuler\u00a0: coordonnées</button>');
    expect(m.root.innerHTML).toContain('aria-label="Comment joindre Pool"');
  });
});

describe('contact details from open map data', () => {
  it('come along with the place, and are shown under it', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    m.root.querySelector('#gl-osm-text').value = JSON.stringify({
      elements: [{ type: 'node', id: 5, timestamp: '2026-10-01T10:00:00Z', tags: { name: 'Arena', elevator: 'yes', phone: '+1 416 555 0142', website: 'http://arena.example.org', 'addr:housenumber': '5', 'addr:street': 'Rink Road' } }],
    });
    press(m, 'gl-osm-add');
    expect(records[0]?.[4]?.contact).toEqual({ address: '5 Rink Road', phone: '+1 416 555 0142', provenance: { source: 'OpenStreetMap contributors', licence: 'ODbL-1.0', date: '2026-10-01', url: 'https://www.openstreetmap.org/node/5' } });
    expect(m.root.innerHTML).toContain('<li data-contact="phone">Phone: <span class="gl-contact-value">+1 416 555 0142</span></li>');
    expect(m.root.innerHTML).not.toContain('arena.example.org');
  });
});
