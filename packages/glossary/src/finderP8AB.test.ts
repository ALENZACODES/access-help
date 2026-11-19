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
  { id: 'hall', name: 'Hall', claims: [yes('elevator'), { termId: 'ramp', status: 'absent', provenance: transit }, { termId: 'grab-bar', status: 'present' }, yes('ramp')] },
];
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
const press = (m: M, id: string): void => m.root.fire('click', { id });
const snaps = (m: M): string => region(m.root, '[data-gl-snaps]');
const keep = (m: M, name: string): void => {
  m.root.querySelector('#gl-snap-name').value = name;
  press(m, 'gl-snap-add');
};
const KEY = 'glossary-record-snapshots';
const TRANSIT_BUTTON = 'id="gl-rrm-3-1" aria-label="Remove the record: Ramp, Transit agency"';

describe('copies of the records', () => {
  it('is offered only when the host keeps records', () => {
    expect(mount().root.innerHTML).not.toContain('gl-snapshots-panel');
    const html = mount({ records: [] }).root.innerHTML;
    expect(html).toContain('<details class="gl-snapshots-panel"><summary>Copies of the records</summary><div data-gl-snaps>');
    expect(html).toContain('<p class="gl-note">No copies are kept.</p>');
  });
  it('keeps a copy under the name typed, redrawing only the panel', () => {
    const m = mount({ records: [] });
    const before = m.root.innerHTML;
    keep(m, '  Before  spring ');
    expect(m.root.innerHTML).toBe(before);
    expect(snaps(m)).toContain('<li>Before spring, kept on 2026-11-15. 4 places, 5 records.<div class="gl-actions">');
    expect(snaps(m)).toContain('<p role="status" data-gl-snap-msg>Kept a copy: Before spring.</p>');
    expect(spoken(m.root)).toBe('Kept a copy: Before spring.');
    expect(m.root.querySelector('#gl-snap-name').focused).toBe(1);
    expect(JSON.parse(m.store.getItem(KEY) ?? '[]')).toHaveLength(1);
  });
  it('names a copy by its date when no name is typed, and refuses the same name twice', () => {
    const m = mount({ records: [] });
    keep(m, '');
    expect(snaps(m)).toContain('<li>2026-11-15, kept on 2026-11-15.');
    keep(m, '');
    expect(spoken(m.root)).toBe('A copy already has that name. Choose another name.');
    expect(JSON.parse(m.store.getItem(KEY) ?? '[]')).toHaveLength(1);
  });
  it('keeps at most five copies', () => {
    const m = mount({ records: [] });
    for (let i = 0; i < 6; i++) keep(m, `Copy ${i}`);
    expect(spoken(m.root)).toBe('You can keep 5 copies. Remove one first.');
    expect(snaps(m).match(/<li>/g)).toHaveLength(5);
  });
  it('shows the copies again on the next visit', () => {
    const store = new Mem();
    keep(mount({ records: [], store }), 'Before spring');
    const html = mount({ records: [], store }).root.innerHTML;
    expect(html).toContain('Before spring, kept on 2026-11-15. 4 places, 5 records.');
    expect(html).toContain('id="gl-snap-use-0" aria-label="Go back to this copy: Before spring">Go back to this copy</button>');
  });
  it('ignores copies in the store that are not well formed', () => {
    const store = new Mem();
    store.setItem(KEY, '{"oops":true}');
    expect(mount({ records: [], store }).root.innerHTML).toContain('No copies are kept.');
  });
  it('shows what differs from a copy, and hides it again on a second press', () => {
    const m = mount({ records: [] });
    keep(m, 'Before spring');
    press(m, 'gl-rrm-3-1');
    press(m, 'gl-snap-diff-0');
    expect(snaps(m)).toContain('<h4>What differs from the copy: Before spring</h4>');
    expect(snaps(m)).toContain('<p role="status">1 record removed.</p>');
    expect(snaps(m)).toContain('<li data-diff="record-removed">Record removed from Hall. Ramp: reported as not available. Source: Transit agency.');
    expect(m.root.querySelector('#gl-snap-diff-0').focused).toBe(1);
    press(m, 'gl-snap-diff-0');
    expect(snaps(m)).toContain('<div data-gl-snap-diff></div>');
  });
  it('says nothing differs right after a copy is kept', () => {
    const m = mount({ records: [] });
    keep(m, 'Now');
    press(m, 'gl-snap-diff-0');
    expect(snaps(m)).toContain('Nothing differs. The two sets of records are the same.');
  });
  it('goes back to a copy, tells the host, and offers Undo', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    keep(m, 'Before spring');
    press(m, 'gl-rrm-3-1');
    expect(m.root.innerHTML).not.toContain(TRANSIT_BUTTON);
    const calls = records.length;
    press(m, 'gl-snap-use-0');
    const html = m.root.innerHTML;
    expect(html).toContain('aria-label="Remove the record: Ramp, Transit agency"');
    expect(html).toContain('<p role="status" data-gl-snap-msg>The records are back to the copy: Before spring.</p>');
    expect(html).toContain('id="gl-undo">Undo: go back to a copy</button>');
    expect(html).toContain('Went back to the copy of the records: Before spring.');
    expect(spoken(m.root)).toBe('The records are back to the copy: Before spring.');
    expect(records).toHaveLength(calls + 1);
    expect(records[records.length - 1]?.find((p) => p.id === 'hall')?.claims).toHaveLength(4);
  });
  it('brings back the records held before when going back is undone', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    keep(m, 'Before spring');
    press(m, 'gl-rrm-3-1');
    press(m, 'gl-snap-use-0');
    press(m, 'gl-undo');
    expect(m.root.innerHTML).not.toContain('Remove the record: Ramp, Transit agency');
    expect(records[records.length - 1]?.find((p) => p.id === 'hall')?.claims).toHaveLength(3);
    expect(m.root.innerHTML).toContain('Before spring, kept on 2026-11-15. 4 places, 5 records.');
  });
  it('changes nothing when the records already match the copy', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    keep(m, 'Now');
    press(m, 'gl-snap-use-0');
    expect(spoken(m.root)).toBe('The records already match that copy.');
    expect(records).toHaveLength(0);
    expect(m.root.innerHTML).not.toContain('id="gl-undo"');
  });
  it('keeps a record that cannot be reported as one that cannot be reported', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    keep(m, 'Before spring');
    press(m, 'gl-rrm-3-2');
    press(m, 'gl-snap-use-0');
    const grab = records[records.length - 1]?.find((p) => p.id === 'hall')?.claims.find((c) => c.termId === 'grab-bar');
    expect(grab?.status).toBe('present');
    expect(grab?.provenance).toBeUndefined();
    expect(m.root.innerHTML).toContain('<th scope="row">Grab bar</th><td data-status="unknown">unknown</td>');
  });
  it('does not offer to go back while a source is left out of the count', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    keep(m, 'Before spring');
    press(m, 'gl-rrm-3-1');
    m.root.fire('change', { id: 'gl-rv-src-0', checked: false });
    expect(m.root.innerHTML).not.toContain('gl-snap-use-0');
    expect(m.root.innerHTML).toContain('gl-snap-diff-0');
    const calls = records.length;
    press(m, 'gl-snap-use-0');
    expect(records).toHaveLength(calls);
  });
  it('removes a copy and says so', () => {
    const m = mount({ records: [] });
    keep(m, 'First');
    keep(m, 'Second');
    press(m, 'gl-snap-diff-1');
    press(m, 'gl-snap-rm-0');
    expect(snaps(m)).not.toContain('First, kept on');
    expect(snaps(m)).toContain('id="gl-snap-rm-0" aria-label="Remove this copy: Second"');
    expect(snaps(m)).toContain('<h4>What differs from the copy: Second</h4>');
    expect(spoken(m.root)).toBe('Removed the copy: First.');
    expect((JSON.parse(m.store.getItem(KEY) ?? '[]') as { name: string }[]).map((s) => s.name)).toEqual(['Second']);
    press(m, 'gl-snap-rm-0');
    expect(snaps(m)).toContain('No copies are kept.');
    expect(snaps(m)).toContain('<div data-gl-snap-diff></div>');
  });
  it('does nothing for a button with no copy behind it', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    for (const id of ['gl-snap-diff-3', 'gl-snap-use-3', 'gl-snap-rm-3']) press(m, id);
    expect(spoken(m.root)).toBe('');
    expect(records).toHaveLength(0);
    expect(m.store.getItem(KEY)).toBeNull();
  });
  it('keeps no copy for a host that does not keep records', () => {
    const m = mount();
    keep(m, 'x');
    expect(m.store.getItem(KEY)).toBeNull();
  });
  it('is in French', () => {
    const m = mount({ records: [], lang: 'fr' });
    keep(m, 'Avant');
    expect(spoken(m.root)).toBe('Copie gardée\u00a0: Avant.');
    expect(snaps(m)).toContain('Avant, copie gardée le 2026-11-15. 4 lieux, 5 fiches.');
    press(m, 'gl-rrm-3-1');
    press(m, 'gl-snap-use-0');
    expect(m.root.innerHTML).toContain('id="gl-undo">Annuler\u00a0: revenir à une copie</button>');
    expect(m.root.innerHTML).toContain('Retour à la copie des fiches\u00a0: Avant.');
  });
});

describe('saving differences as text', () => {
  const HEADS = RECORD_COLUMNS.join(',');
  const TABLE = [HEADS, 'lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,', 'depot,Depot,,,,,,,'].join('\n');
  const check = (m: M, table: string): void => {
    m.root.querySelector('#gl-records-text').value = table;
    press(m, 'gl-records-check');
  };
  it('shows each difference under the check of a table, and changes nothing', () => {
    const records: (readonly Place[])[] = [];
    const m = mount({ records });
    check(m, TABLE);
    const html = region(m.root, '[data-gl-preview]');
    expect(html).toContain('<details class="gl-preview-detail"><summary>See each difference</summary>');
    expect(html).toContain('<li data-diff="place-removed">Place removed: Café Nord.</li>');
    expect(html).toContain('<li data-diff="place-added">Place added: Depot.</li>');
    expect(html).not.toContain('gl-preview-diff-export');
    expect(records).toHaveLength(0);
  });
  it('shows no differences for a table that cannot be read', () => {
    const m = mount({ records: [] });
    check(m, 'nonsense');
    expect(region(m.root, '[data-gl-preview]')).not.toContain('gl-preview-detail');
  });
  it('saves the differences of a checked table', () => {
    const exports: ExportFile[] = [];
    const m = mount({ records: [], exports });
    check(m, TABLE);
    expect(region(m.root, '[data-gl-preview]')).toContain('id="gl-preview-diff-export">Save the differences as text</button>');
    press(m, 'gl-preview-diff-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('table-differences-en.txt');
    expect(exports[0]?.text).toContain('What loading the table would change\nMade on 2026-11-15.\n\nThe table would replace the records held now.');
    expect(exports[0]?.text).toContain('- Place added: Depot.');
  });
  it('saves nothing when the box no longer holds a table that can be loaded', () => {
    const exports: ExportFile[] = [];
    const m = mount({ records: [], exports });
    check(m, TABLE);
    m.root.querySelector('#gl-records-text').value = '';
    press(m, 'gl-preview-diff-export');
    expect(exports).toHaveLength(0);
  });
  it('saves what differs from a copy', () => {
    const exports: ExportFile[] = [];
    const m = mount({ records: [], exports });
    press(m, 'gl-snap-diff-export');
    keep(m, 'Before spring');
    press(m, 'gl-rrm-3-1');
    press(m, 'gl-snap-diff-0');
    expect(snaps(m)).toContain('id="gl-snap-diff-export">Save these differences as text</button>');
    press(m, 'gl-snap-diff-export');
    expect(exports).toHaveLength(1);
    expect(exports[0]?.filename).toBe('copy-differences-en.txt');
    expect(exports[0]?.mime).toBe('text/plain;charset=utf-8');
    expect(exports[0]?.text).toContain('What differs from the copy: Before spring\nMade on 2026-11-15.');
    expect(exports[0]?.text).toContain('1 record removed.\n\n- Record removed from Hall. Ramp: reported as not available.');
  });
});
